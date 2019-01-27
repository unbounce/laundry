import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';
import { withSuggestion } from '../util';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};
export default class RefsValidator extends Validator {

  refs = [
    // From https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html
    'AWS::Partition',
    'AWS::Region',
    'AWS::StackId',
    'AWS::StackName',
    'AWS::URLSuffix',
    'AWS::NoValue',
    'AWS::AccountId'
  ];

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
      });
    }
  }

  CfnFn(path: Path, propertyName: string, value: yaml.CfnFn) {
    if (value instanceof yaml.Ref && _.isString(value.data)) {
      if (!_.includes(this.refs, value.data)) {
        const message = withSuggestion(`${value.data} is not a valid Parameter or Resource`, this.refs, value.data);
        this.errors.push({path, message});
      }
    }
  }
}
