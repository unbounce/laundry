import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import {Validator} from '../validate';
import {Path, Error} from '../types';
import {ResourceTypes, Attributes, PropertyValueType} from '../spec';
import {cfnFnName} from '../util';

export class CfnFnsValidator extends Validator {
  stack: yaml.CfnFn[] = [];
  resourceType: any;

  Resource(path: Path, resource: any) {
    const properties = _.get(resource, 'Properties');
    const resourceType = _.get(resource, 'Type');
    this.resourceType = resourceType;
    // if(_.isObject(properties)) {
    //   _.forEach(properties, (value, key) => {
    //     if(value instanceof yaml.CfnFn) {
    //       this.CfnFn(path.concat(['Properties', key, cfnFnName(value)]), resourceType, value);
    //     }
    //   });
    // }
  }

  CfnFn(path: Path, tag: yaml.CfnFn) {
    // _.forEach(this.stack, (tag) => {
    //   if(!_.includes(tag.supportedFns, tag.constructor)) {
    //     this.errors.push({ path, message: `can not be used within ${cfnFnName(tag)}`});
    //   }
    // });

    if(tag.paramSpec) {
      if(_.isFunction(tag.paramSpec)) {
        tag.paramSpec(path, this.errors);
      } else if(_.isObject(tag.paramSpec)) {
        validate.spec(path, this.resourceType, tag.paramSpec as PropertyValueType, tag.data, this.errors);
      }
    }

    // if(tag.data instanceof yaml.CfnFn) {
    //   this.stack.push(tag);
    //   this.CfnFn(path.concat(cfnFnName(tag.data)), this.resourceType, tag.data);
    //   this.stack.pop();
    // }
  }
}
