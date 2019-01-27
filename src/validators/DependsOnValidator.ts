import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';
import { withSuggestion } from '../util';

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
      const dependsOn = _.flatten([_.get(resource, 'DependsOn')]);
      let resourceNames = [];

      // DependsOn can be a resource or a list of resources
      if (_.isArray(dependsOn)) {
        if (validate.list(path, dependsOn, this.errors, validate.string)) {
          resourceNames = dependsOn;
        }
      } else {
        if (validate.string(path, dependsOn, this.errors)) {
          resourceNames = [dependsOn];
        }
      }

      _.forEach(resourceNames, (resourceName) => {
        if (!_.includes(this.resources, resourceName)) {
          this.errors.push({
            path,
            message: withSuggestion(`${resourceName} is not a valid Resource`, this.resources, resourceName)
          });
        }
      });
    }
  }

}
