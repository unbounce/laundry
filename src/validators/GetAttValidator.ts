import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { ResourceTypes, Attributes } from '../spec';
import { cfnFnName, withSuggestion } from '../util';

type Parameters = {
  [name: string]: 'String' | 'List' | 'Number'
};

// Validates that !GetAtts reference a valid resource or parameter
export default class GetAttValidator extends Validator {
  private resources: { [name: string]: string[] } = {}
  private customResources: string[] = [];

  Resources(path: Path, resources: any) {
    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        const type = _.get(resource, 'Type');
        if (_.startsWith(type, 'Custom::')) {
          this.customResources.push(name);
        } else {
          this.resources[name] = _.get(ResourceTypes, [type, 'Attributes'], {});
        }
      });
    }
  }

  CfnFn(path: Path, propertyName: string, value: yaml.CfnFn) {
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
      const fullAttribute = parts.join('.');

      if (_.includes(this.customResources, resource)) {
        // TODO check Attributes of custom resources
        return;
      }

      if (_.includes(_.keys(this.resources), resource)) {
        // Some resources, like `AWS::ElasticLoadBalancing::LoadBalancer` have
        // Attributes with a dot in them, like `SourceSecurityGroup.GroupName`
        if (_.has(this.resources, [resource, fullAttribute])) {
          return;
        }

        if (_.has(this.resources, [resource, attribute])) {
          // Only `Json` type attributes can have a nested attribute
          if (parts.length > 1 && _.get(this.resources, [resource, attribute, 'PrimitiveType']) !== 'Json') {
            const message = withSuggestion(
              `${fullAttribute} is not a valid attribute of ${resource}`,
              _.keys(_.get(this.resources, resource)),
              attribute
            );
            this.errors.push({path, message});
          }
        } else {
          const message = withSuggestion(
            `${attribute} is not a valid attribute of ${resource}`,
            _.keys(_.get(this.resources, resource)),
            attribute
          );
          this.errors.push({path, message});
        }
      } else {
        const message = withSuggestion(
          `${resource} is not a valid Resource`,
          _.keys(this.resources),
          resource
        );
        this.errors.push({path, message});
      }
    }
  }
}
