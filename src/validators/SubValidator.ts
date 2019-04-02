import * as _ from 'lodash';

import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path } from '../types';
import { ResourceTypes } from '../spec';
import { subVariables, withSuggestion } from '../util';

// Validates that !Sub reference a valid resource or parameter
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html
export default class SubValidator extends Validator {
  private refs = [
    // From https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html
    'AWS::Partition',
    'AWS::Region',
    'AWS::StackId',
    'AWS::StackName',
    'AWS::URLSuffix',
    'AWS::NoValue',
    'AWS::AccountId'
  ];

  private resources: { [name: string]: string[] } = {}

  Parameters(path: Path, parameters: any) {
    if (_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.refs.push(name);
      });
    }
  }

  Resources(path: Path, resources: any) {
    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        this.refs.push(name);
        const type = _.get(resource, 'Type');
        this.resources[name] = _.keys(_.get(ResourceTypes, [type, 'Attributes'], {}));
      });
    }
  }

  CfnFn(path: Path, propertyName: string, value: yaml.CfnFn) {
    // If you specify template parameter names or resource logical IDs, such as
    // ${InstanceTypeParameter}, AWS CloudFormation returns the same values as if
    // you used the Ref intrinsic function. If you specify resource attributes,
    // such as ${MyInstance.PublicIp}, AWS CloudFormation returns the same values
    // as if you used the Fn::GetAtt intrinsic function.
    //
    // To write a dollar sign and curly braces (${}) literally, add an exclamation
    // point (!) after the open curly brace, such as ${!Literal}. AWS
    // CloudFormation resolves this text as ${Literal}.
    if (value instanceof yaml.Sub) {
      let localRefs: string[] = [];
      let variables = subVariables(value);
      if (_.isArray(value.data) && _.isString(value.data[0]) && _.isArray(value.data[1])) {
        localRefs = _.keys(value.data[1]);
      }
      _.forEach(variables, (variable) => {
        let resource, attribute;
        [resource, attribute] = variable.split('.', 2);
        if (attribute) {
          if (_.includes(_.keys(this.resources), resource)) {
            if (!_.includes(_.get(this.resources, resource), attribute)) {
              this.addError(
                path,
                withSuggestion(
                  `${attribute} is not a valid Attribute of ${resource}`,
                  _.get(this.resources, resource),
                  resource
                )
              );
            }
          } else {
            const message = withSuggestion(
              `${resource} is not a valid Resource`,
              _.keys(this.resources),
              resource
            );
            this.addError(path, message);
          }
        } else {
          if (!_.includes(this.refs, resource)) {
            const message = withSuggestion(`${resource} not a valid Parameter or Resource`, this.refs, resource);
            this.addError(path, message);
          }
        }
      });
    }
  }
}
