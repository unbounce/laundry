import * as _ from 'lodash';

import * as validate from '../validate';
import { Validator } from '../validate';
import { Path, ErrorFn } from '../types';

export default class RootValidator extends Validator {
  Root(path: Path, root: any) {
    validate.object(path, root, this.addError);
    // TODO unknown keys
  }

  Resources(path: Path, resources: any) {
    validate.required(path, resources, this.addError) && validate.object(path, resources, this.addError);
  }

  Description(path: Path, description: any) {
    validate.optional(path, description, this.addError) && validate.string(path, description, this.addError);
  }

  AWSTemplateFormatVersion(path: Path, version: any) {
    if (validate.optional(path, version, this.addError) && validate.string(path, version, this.addError)) {
      if (!version.match(/\d{4}-\d{2}-\d{2}/)) {
        this.addError(path, 'must be in the format 2010-09-09');
      }
    }
  }

  Metadata(path: Path, metadata: any) {
    validate.optional(path, metadata, this.addError) && validate.object(path, metadata, this.addError);
  }

  Mappings(path: Path, mappings: any) {
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html
    validate.optional(path, mappings, this.addError) && validate.object(path, mappings, this.addError);
  }

  Mapping(path: Path, mapping: any) {
    if (validate.object(path, mapping, this.addError)) {
      _.forEach(mapping, (m, name) => {
        if (validate.object(path.concat(name), mapping, this.addError)) {
          _.forEach(mapping, (value, key) => {
            validate.object(path.concat(key), value, this.addError);
          });
        }
      });
    }
  }

  Conditions(path: Path, conditions: any) {
    validate.optional(path, conditions, this.addError) && validate.object(path, conditions, this.addError);
  }

  // Transform(path: Path, transform: any) {
  //   validate.optional(path, transform, this.addError) && validate.object(path, transform, this.addError);
  // }

  Outputs(path: Path, outputs: any) {
    validate.optional(path, outputs, this.addError) && validate.object(path, outputs, this.addError);
  }

  Output(path: Path, output: any) {
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
    const properties = {
      Description: [validate.optional, validate.string],
      Condition: [validate.optional, validate.string],
      Value: [validate.required, validate.string],
      Export: [
        validate.optional,
        validate.object,
        (path: Path, value: any, addError: ErrorFn) => {
          const properties = {
            Name: [validate.required, validate.string]
          };
          return validate.object(path, value, addError, properties)
        }
      ]
    };
    validate.object(path, output, this.addError, properties);
  }
}
