import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import {Validator} from '../validate';
import {Path, Error} from '../types';
import {ResourceTypes, Attributes} from '../spec';

function cfnFnName(tag: yaml.CfnFn<any>) {
  return tag.constructor.name;
}

export class CfnFnsValidator extends Validator {
  stack: yaml.CfnFn<any>[] = [];

  Resource(path: Path, resource: any) {
    const properties = _.get(resource, 'Properties');
    const resourceType = _.get(resource, 'Type');
    if(_.isObject(properties)) {
      _.forEach(properties, (value, key) => {
        if(value instanceof yaml.CfnFn) {
          this.CfnFn(path.concat(['Properties', key, cfnFnName(value)]), resourceType, value);
        }
      });
    }
  }

  CfnFn(path: Path, resourceType: string, tag: yaml.CfnFn<any>) {
    _.forEach(this.stack, (tag) => {
      if(!_.includes(tag.supportedFns, tag.constructor)) {
        this.errors.push({ path, message: `can not be used within ${cfnFnName(tag)}`});
      }
    });

    if(tag.paramSpec) {
      const paramErrors: Error[] = [];
      _.forEach(tag.paramSpec, (spec) => {
        validate.spec(path, resourceType, spec, tag.data, paramErrors);
      });
      //  TODO this sucks
      // If no specs passed
      if(tag.paramSpec.length === paramErrors.length) {
        this.errors.push({
          path,
          message: _.join(_.map(paramErrors, (e) => e.message), ' or ')
        })
      }
    }

    if(tag.data instanceof yaml.CfnFn) {
      this.stack.push(tag);
      this.CfnFn(path.concat(cfnFnName(tag.data)), resourceType, tag.data);
      this.stack.pop();
    }
  }
}
