import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';
import { cfnFnName } from '../util';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};

// Validates that !GetAtts reference a valid resource or parameter
export default class GetAttValidator extends Validator {
  private resources: { [name: string]: string[] } = {}

  Resources(path: Path, resources: any) {
    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        const type = _.get(resource, 'Type');
        this.resources[name] = _.get(ResourceTypes, [type, 'Attributes'], {});
      });
    }
  }

  CfnFn(path: Path, value: yaml.CfnFn) {
    if (value instanceof yaml.GetAtt) {
      let resource, attribute, parts;
      if (value.isYamlTag() && _.isString(value.data)) {
        // !GetAtt A.Att
        // !GetAtt A.Att.Nested
        if (!value.data.match(/^([A-Za-z0-9]+\.[A-Za-z0-9]+)+$/)) {
          this.errors.push({ path, message: 'must be in the format `Resource.Attribute`' });
          return;
        }
        [resource, ...parts] = value.data.split('.');
      } else if (_.isArray(value.data) && value.data.length > 1 && _.isString(value.data[0])) {
        // !GetAtt [A, Att]
        // !GetAtt [A, Att.Nested]
        resource = value.data[0];
        parts = value.data[1].split('.');
      } else {
        return;
      }

      attribute = parts[0];

      if (_.includes(_.keys(this.resources), resource)) {
        if (_.has(this.resources, [resource, attribute])) {
          // Only `Json` type attributes can have a nested attribute
          if (parts.length > 1 && _.get(this.resources, [resource, attribute, 'PrimitiveType']) !== 'Json') {
            this.errors.push({ path, message: `${parts.join('.')} is not a valid attribute of ${resource}` });
          }
        } else {
          this.errors.push({ path, message: `${attribute} is not a valid attribute of ${resource}` });
        }
      } else {
        this.errors.push({ path, message: `${resource} is not a valid Resource` });
      }
    }
  }
}
