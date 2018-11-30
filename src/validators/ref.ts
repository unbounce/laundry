import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import {Validator} from '../validate';
import {Path, Error} from '../types';
import {ResourceTypes, Attributes} from '../spec';
import {toCfnFn} from '../util';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};
export class RefValidator extends Validator {

  refs = [
    // From https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html
    'AWS::Partition',
    'AWS::Region',
    'AWS::StackId',
    'AWS::StackName',
    'AWS::URLSuffix'
  ];

  Parameters(path: Path, parameters: any) {
    if(_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.refs.push(name);
      });
    }
  }

  Resources(path: Path, resources: any) {
    if(_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        this.refs.push(name);
      });
    }
  }

  ResourceProperty(path: Path, name: string, value: any) {
    if(value instanceof yaml.Ref && _.isString(value.data)) {
      if(!_.includes(this.refs, value.data)) {
        this.errors.push({ path, message: 'not a valid Parameter or Resource'});
      }
    }
  }
}
