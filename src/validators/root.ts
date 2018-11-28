import * as _ from 'lodash';

import * as validate from '../validate';
import {Validator} from '../validate';
import {Path, Error} from '../types';

export class RootValidator extends Validator {
  Root(path: Path, root: any) {
    validate.object(path, root, this.errors);
  }

  Resources(path: Path, resources: any) {
    validate.required(path, resources, this.errors) && validate.object(path, resources, this.errors);
  }

  Description(path: Path, description: any) {
    validate.optional(description) && validate.string(path, description, this.errors);
  }

  AWSTemplateFormatVersion(path: Path, version: any) {
    if (_.isUndefined(version)) return;

    if(validate.string(path, version, this.errors)) {
      if(!version.match(/\d{4}-\d{2}-\d{2}/)) {
        this.errors.push({path, message: 'must be in the format 2010-09-09'});
      }
    }
  }

  Metadata(path: Path, metadata: any) {
    validate.optional(metadata) && validate.object(path, metadata, this.errors);
  }

  // Mappings(path: Path, mappings: any) {
  //   validate.optional(mappings) && validate.object(path, mappings, this.errors);
  // }

  // Conditions(path: Path, conditions: any) {
  //   validate.optional(conditions) && validate.object(path, conditions, this.errors);
  // }

  // Transform(path: Path, transform: any) {
  //   validate.optional(transform) && validate.object(path, transform, this.errors);
  // }

  // Outputs(path: Path, outputs: any) {
  //   validate.optional(outputs) && validate.object(path, outputs, this.errors);
  // }
}
