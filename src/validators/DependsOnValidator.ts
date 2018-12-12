import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';

export default class DependsOnValidator extends Validator {

  resources: string[] = [];

  Resources(path: Path, resources: any) {
    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        this.resources.push(name);
      });
    }
  }

  Resource(path: Path, resource: any) {
    if (_.isObject(resource) && _.has(resource, 'DependsOn')) {
      const dependsOn = _.get(resource, 'DependsOn');
      if (!_.includes(this.resources, dependsOn)) {
        this.errors.push({ path, message: `${dependsOn} is not a valid Resource` });
      }
    }
  }

}
