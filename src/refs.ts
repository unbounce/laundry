import * as _ from 'lodash';

import * as validate from './validate';
import * as yaml from './yaml';
import {Validator} from './validate';
import {Path, Error} from './types';
import {ResourceTypes, Attributes} from './spec';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};

// From https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html
const psedoParameters = [
  'AWS::Partition',
  'AWS::Region',
  'AWS::StackId',
  'AWS::StackName',
  'AWS::URLSuffix'
];

export class RefsValidator extends Validator {
  private parameters: { [name: string]: string|undefined } = {}
  private resources: { [name: string]: Attributes|undefined } = {}

  Parameters(path: Path, parameters: any) {
    if(_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.parameters[name] = _.get(parameter, 'Type');
      });
    }
  }

  Resources(path: Path, resources: any) {
    if(_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        this.resources[name] = _.get(ResourceTypes, [name, 'Attributes']);;
      });
    }
  }

  ResourceProperty(path: Path, name: string, value: any) {
    if(value instanceof yaml.Ref) {
      if(!_.includes(_.keys(this.parameters), value.data) &&
         !_.includes(_.keys(this.resources), value.data) &&
         !_.includes(psedoParameters, value.data)) {
        this.errors.push({ path, message: 'not a valid Parameter or Resource'});
      }
    }
  }
}
