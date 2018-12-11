import * as _ from 'lodash';

import * as validate from '../validate';
import { Validator } from '../validate';
import { Path, Error } from '../types';

export default class RootValidator extends Validator {
  Root(path: Path, root: any) {
    validate.object(path, root, this.errors);
    // TODO unknown keys
  }

  Resources(path: Path, resources: any) {
    validate.required(path, resources, this.errors) && validate.object(path, resources, this.errors);
  }

  Description(path: Path, description: any) {
    validate.optional(path, description, this.errors) && validate.string(path, description, this.errors);
  }

  AWSTemplateFormatVersion(path: Path, version: any) {
    if (validate.optional(path, version, this.errors) && validate.string(path, version, this.errors)) {
      if (!version.match(/\d{4}-\d{2}-\d{2}/)) {
        this.errors.push({ path, message: 'must be in the format 2010-09-09' });
      }
    }
  }

  Metadata(path: Path, metadata: any) {
    validate.optional(path, metadata, this.errors) && validate.object(path, metadata, this.errors);
  }

  Mappings(path: Path, mappings: any) {
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html
    validate.optional(path, mappings, this.errors) && validate.object(path, mappings, this.errors);
  }

  Mapping(path: Path, mapping: any) {
    if (validate.object(path, mapping, this.errors)) {
      _.forEach(mapping, (m, name) => {
        if (validate.object(path.concat(name), mapping, this.errors)) {
          _.forEach(mapping, (value, key) => {
            validate.object(path.concat(key), value, this.errors);
          });
        }
      });
    }
  }

  Conditions(path: Path, conditions: any) {
    validate.optional(path, conditions, this.errors) && validate.object(path, conditions, this.errors);
  }

  // Transform(path: Path, transform: any) {
  //   validate.optional(path, transform, this.errors) && validate.object(path, transform, this.errors);
  // }

  Outputs(path: Path, outputs: any) {
    validate.optional(path, outputs, this.errors) && validate.object(path, outputs, this.errors);
  }

  Output(path: Path, output: any) {
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
    const properties = {
      Description: [validate.optional, validate.string],
      Value: [validate.required, validate.string],
      Export: [
        validate.optional,
        validate.object,
        (path: Path, value: any, errors: Error[]) => {
          const properties = {
            Name: [validate.required, validate.string]
          };
          return validate.object(path, value, errors, properties)
        }
      ]
    };
    validate.object(path, output, this.errors, properties);
  }
}
