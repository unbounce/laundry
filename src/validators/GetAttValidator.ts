import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import {Validator} from '../validate';
import {Path, Error} from '../types';
import {ResourceTypes, Attributes} from '../spec';
import {cfnFnName} from '../util';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};

// Validates that !GetAtts reference a valid resource or parameter
export default class GetAttValidator extends Validator {
  private resources: { [name: string]: string[] } = {}

  Resources(path: Path, resources: any) {
    if(_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        const type = _.get(resource, 'Type');
        this.resources[name] = _.keys(_.get(ResourceTypes, [type, 'Attributes'], {}));;
      });
    }
  }

  CfnFn(path: Path, value: yaml.CfnFn) {
    if(value instanceof yaml.GetAtt) {
      let resource, attribute, parts;
      if(value.isYAML() && _.isString(value.data)) {
        // !GetAtt A.Att
        [resource, ...parts] = value.data.split('.');
      } else if(_.isArray(value.data) && value.data.length === 2 && _.isString(value.data[0])){
        // !GetAtt [A, Att]
        [resource, ...parts] = value.data;
      } else {
        return;
      }

      attribute = parts.join('.');

      if(_.includes(_.keys(this.resources), resource)) {
        if(!_.includes(this.resources[resource], attribute)) {
          this.errors.push({ path, message: `${attribute} is not a valid attribute of ${resource}`});
        }
      } else {
        this.errors.push({ path, message: `${resource} is not a valid Resource`});
      }
    }
  }
}
