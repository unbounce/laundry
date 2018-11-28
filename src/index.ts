import * as _ from 'lodash';

import {ParametersValidator} from './parameters';
import {RefsValidator} from './refs';
import {Path, Error, ResourceSpecificationError} from './types';
import {Visitor, Walker} from './ast';

import * as yaml from './yaml';
import * as validate from './validate';
import {Validator} from './validate';
import {
  PrimitiveType,
  Type,
  ResourceType,
  PropertyType,
  ResourceTypes,
  PropertyTypes
} from './spec';

class RootValidator extends Validator {
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

class ResourceTypeValidator extends Validator {
  Resource(path: Path, resource: any) {
     if(_.isObject(resource)) {
       if(validate.required(path, resource.Type, this.errors)) {
        const s: ResourceType = _.get(ResourceTypes, resource.Type);
         if(!s) {
          this.errors.push({
            path: path.concat('Type'),
            message: `invalid type ${resource.Type}`
          });
        }
      }
    }
  }
}

class RequriedResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
     if(_.isObject(resource)) {
      const s: ResourceType = _.get(ResourceTypes, resource.Type);
       if(s) {
        _.forEach(s.Properties, (property, name) => {
           if(property.Required) {
             validate.required(path.concat(name), resource[name], this.errors);
          }
        });
      }
    }
  }
}

class ResourcePropertyValidator extends Validator {
  Resource(path: Path, resource: any) {
    if(_.isObject(resource)) {
      const resourceType: ResourceType = _.get(ResourceTypes, resource.Type);
      if(resourceType) {
        if(_.isObject(resource.Properties)) {
          this.forEachWithPath(path.concat('Properties'), resource.Properties, (path, property, name) => {
            const propertyType = resourceType.Properties[name];
            if(propertyType) {
              if(propertyType.PrimitiveType) {
                this.validatePrimitiveType(path, propertyType.PrimitiveType, property);
              } else if(propertyType.Type === 'List') {
                if(_.isArray(property)) {
                  this.forEachWithPath(path, property, (path, v, i) => {
                    if(propertyType.PrimitiveItemType) {
                      this.validatePrimitiveType(path, propertyType.PrimitiveItemType, v);
                    } else if(propertyType.ItemType) {
                      this.validateType(path, propertyType.ItemType, v);
                    } else {
                      throw new ResourceSpecificationError('No property type');
                    }
                  });
                } else {
                  this.errors.push({ path, message: 'must be a List'});
                }
              } else if(propertyType.Type) {
                this.validateType(path, propertyType.Type, property);
              } else {
                throw new ResourceSpecificationError('No property type');
              }
            } else {
              this.errors.push({path, message: 'invalid property'});
            }
          });
        }
      }
    }
  }

  validatePrimitiveType(path: Path, primitiveType: PrimitiveType, property: any) {
    let predicate: (path: Path, o: any, errors: Error[]) => boolean;
    switch(primitiveType) {
      case 'Boolean':
        predicate = validate.boolean;
        break;
      case 'Double':
        predicate = validate.number;
        break;
      case 'Integer':
        predicate = validate.number;
        break;
      case 'Json':
        predicate = validate.object;
        break;
      case 'Long':
        predicate = validate.number;
        break;
      case 'String':
        predicate = validate.string;
        break;
      case 'Timestamp':
        predicate = validate.string; // TODO better check
      default:
        throw new ResourceSpecificationError('Unknown PrimitiveType');
    }
    predicate.call(undefined, path, property, this.errors);
  }

  validateType(path: Path, type: Type, properties: any) {
    const propertyType = _.get(PropertyTypes, type);
     if(propertyType) {
       if(validate.object(path, properties, this.errors)) {
         this.forEachWithPath(path, properties, (path, property, name) => {
          const s = _.get(propertyType.Properties, name);
           if(s) {
             if(s.PrimitiveItemType) {
              this.validatePrimitiveType(path, s.PrimitiveItemType, property);
            } else  if(s.Type === 'List') {
               if(_.isArray(property)) {
                 this.forEachWithPath(path, property, (path, v, k) => {
                   if(s.PrimitiveItemType) {
                    this.validatePrimitiveType(path, s.PrimitiveItemType, v);
                  } else  if(s.ItemType) {
                    this.validateType(path, s.ItemType, v);
                  } else {
                    throw new ResourceSpecificationError('Unknown List Type')
                  }
                });
              } else {
                this.errors.push({path, message: 'must be a List'});
              }
            }
          } else {
            this.errors.push({path, message: 'invalid property'});
          }
        });
      }
    } else {
      throw new ResourceSpecificationError('Unknown Type');
    }
  }
}

export function lint(template: string) {
  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ParametersValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors),
    new RefsValidator(errors)
  ];
  const walker = new Walker(validators);
  walker.Root(yaml.load(template));
  return errors;
}
