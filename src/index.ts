import * as yaml from 'js-yaml';
import * as _ from 'lodash';

import spec from './CloudFormationResourceSpecification.json';
type PrimitiveType = string; //'Boolean' | 'Double' | 'Integer' | 'Json' | 'Long' | 'String' | 'Timestamp';
type UpdateType = string; // 'Immutable' | 'Mutable' | 'Conditional';
type Type = string; // TODO better type
type ResourceType = {
  Attributes?: {
    [attribute: string]: {
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
    }
  },
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
      UpdateType: UpdateType
    }
  }
}
type PropertyType = {
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
      UpdateType: UpdateType
    }
  }
}
const ResourceTypes: { [resourceType: string]: ResourceType } = spec.ResourceTypes;
const PropertyTypes: { [propertyType: string]: PropertyType } = spec.PropertyTypes;

// Based on https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html
const rootProperties = [
  'AWSTemplateFormatVersion',
  'Description',
  'Metadata',
  'Parameters',
  'Mappings',
  'Conditions',
  'Transform',
  'Resources',
  'Outputs'
];

export type Path = string[];

class Visitor {
  // Root

  Root(path: Path, root: any): void {}
  AWSTemplateFormatVersion(path: Path, version: any): void {}
  Description(path: Path, description: any): void {}
  Metadata(path: Path, metadata: any): void {}
  Parameters(path: Path, parameters: any): void {}
  Mappings(path: Path, mappings: any): void {}
  Conditions(path: Path, conditions: any): void {}
  Transform(path: Path, transform: any): void {}
  Resources(path: Path, resources: any): void {}
  Outputs(path: Path, outputs: any): void {}

  Parameter(path: Path, parameter: any): void {}

  Mapping(path: Path, mapping: any): void {}

  Condition(path: Path, condition: any): void {}

  Resource(path: Path, resource: any): void {}
  // Properties(path: Path, properties: any): void {}
  // Property(path: Path, property: any): void {}

  Output(path: Path, output: any): void {}

}

class Walker {
  private paths: Path[] = [];
  private visitors: Visitor[] = [];

  constructor(visitors: Visitor[]) {
    this.visitors = visitors;
  }

  private pushPath(s: string): Path {
    // Push new path onto the stack without modifying existing one
    const prevPath = _.get(this.paths, this.paths.length - 1, []);
    const path = [...prevPath, s];
    this.paths.push(path);
    return path;
  }

  private popPath() {
    // Return to the previous path in the stack
    this.paths.pop();
  }

  Root(root: object): void {
    const path = this.pushPath('Root');
    _.forEach(this.visitors, (v) => v.Root(path, root));

    this.AWSTemplateFormatVersion(_.get(root, 'AWSTemplateFormatVersion'));
    this.Description(_.get(root, 'Description'));
    this.Metadata(_.get(root, 'Metadata'));
    this.Parameters(_.get(root, 'Parameters'));
    this.Mappings(_.get(root, 'Mappings'));
    this.Conditions(_.get(root, 'Conditions'));
    this.Transform(_.get(root, 'Transform'));
    this.Resources(_.get(root, 'Resources'));
    this.Outputs(_.get(root, 'Outputs'));
    this.popPath();
  }

  AWSTemplateFormatVersion(version: any): void {
    const path = this.pushPath('AWSTemplateFormatVersion');
    _.forEach(this.visitors, (v) => v.AWSTemplateFormatVersion(path, version));
    this.popPath();
  }

  Description(description: any): void {
    const path = this.pushPath('Description');
    _.forEach(this.visitors, (v) => v.Description(path, description));
    this.popPath();
  }

  Metadata(metadata: any): void {
    const path = this.pushPath('Metadata');
    _.forEach(this.visitors, (v) => v.Metadata(path, metadata));
    this.popPath();
  }

  Parameters(parameters: any): void {
    const path = this.pushPath('Parameters');
    _.forEach(this.visitors, (v) => v.Parameters(path, parameters));

     if(_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Parameter(path, parameter));
        this.popPath();
      });
    }
    this.popPath();
  }

  Mappings(mappings: any): void {}
  Conditions(conditions: any): void {}
  Transform(transform: any): void {}

  Resources(resources: any): void {
    let path = this.pushPath('Resources');
    _.forEach(this.visitors, (v) => v.Resources(path, resources));

     if(_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        let path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Resource(path, resource));
        this.popPath();
      });
    }
    this.popPath();
  }

  Outputs(outputs: any): void {}
}

export type Error = {
  path: Path,
  message: String
};
class ResourceSpecificationError extends Error {
  constructor(message: string) {
    super(`${message} - there may be an error in the CloudFormation Resource Specification`);
  }
}

class Validator extends Visitor {
  protected errors: Error[];

  constructor(errors: Error[]) {
    super();
    this.errors = errors;
  }

  protected isPresent(path: Path, o: any): boolean {
     if(_.isNil(o)) {
      this.errors.push({path, message: 'is required'});
      return false;
    } else {
      return true;
    }
  }

  protected isObject(path: Path, o: any): boolean {
     if(!_.isObject(o)) {
      this.errors.push({path, message: 'must be an object'});
      return false;
    } else {
      return true;
    }
  }

  protected forEachWithPath<T>(path: Path, as: Array<T>, fn: (path: Path, a: T, i: number|string) => void): void {
    _.forEach(as, (a, i) => {
      fn(path.concat(i.toString()), a, i);
    });
  }

}

class RootValidator extends Validator {
  Root(path: Path, root: any) {
    this.isObject(path, root);
  }

  Resources(path: Path, resources: any) {
    this.isPresent(path, resources) && this.isObject(path, resources);
  }
}

class ResourceTypeValidator extends Validator {
  Resource(path: Path, resource: any) {
     if(_.isObject(resource)) {
       if(this.isPresent(path, resource.Type)) {
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
            this.isPresent(path.concat(name), resource[name]);
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
                this.isPrimitiveType(path, propertyType.PrimitiveType, property);
              } else if(propertyType.Type === 'List') {
                if(_.isArray(property)) {
                  this.forEachWithPath(path, property, (path, v, i) => {
                    if(propertyType.PrimitiveItemType) {
                      this.isPrimitiveType(path, propertyType.PrimitiveItemType, v);
                    } else if(propertyType.ItemType) {
                      this.isType(path, propertyType.ItemType, v);
                    } else {
                      throw new ResourceSpecificationError('No property type');
                    }
                  });
                } else {
                  this.errors.push({ path, message: 'must be a List'});
                }
              } else if(propertyType.Type) {
                this.isType(path, propertyType.Type, property);
              } else {
                throw new ResourceSpecificationError('No property type');
              }
            } else {
              this.errors.push({path: path, message: 'invalid property'});
            }
          });
        }
      }
    }
  }

  isPrimitiveType(path: Path, primitiveType: PrimitiveType, property: any) {
    let predicate: (a: any) => boolean;
    switch(primitiveType) {
      case 'Boolean':
        predicate = _.isBoolean;
        break;
      case 'Double':
        predicate = _.isFinite;
        break;
      case 'Integer':
        predicate = _.isInteger;
        break;
      case 'Json':
        predicate = _.isPlainObject;
        break;
      case 'Long':
        predicate = _.isFinite;
        break;
      case 'String':
        predicate = _.isString;
        break;
      case 'Timestamp':
        predicate = _.isString; // TODO better check
      default:
        throw new ResourceSpecificationError('Unknown PrimitiveType');
    }
     if(!predicate.apply(property)) {
      this.errors.push({path, message: `must be a ${primitiveType}`});
    }
  }

  isType(path: Path, type: Type, properties: any) {
    const propertyType = _.get(PropertyTypes, type);
     if(propertyType) {
       if(this.isObject(path, properties)) {
         this.forEachWithPath(path, properties, (path, property, name) => {
          const s = _.get(propertyType.Properties, name);
           if(s) {
             if(s.PrimitiveItemType) {
              this.isPrimitiveType(path, s.PrimitiveItemType, property);
            } else  if(s.Type === 'List') {
               if(_.isArray(property)) {
                 this.forEachWithPath(path, property, (path, v, k) => {
                   if(s.PrimitiveItemType) {
                    this.isPrimitiveType(path, s.PrimitiveItemType, v);
                  } else  if(s.ItemType) {
                    this.isType(path, s.ItemType, v);
                  } else {
                    throw new ResourceSpecificationError('Unknown List Type')
                  }
                });
              } else {
                this.errors.push({path: path, message: 'must be a List'});
              }
            }
          } else {
            this.errors.push({path: path, message: 'invalid property'});
          }
        });
      }
    } else {
      throw new ResourceSpecificationError('Unknown Type');
    }
  }
}

export function validate(template: string) {
  const errors: Error[] = [];
  const validators = [
    new RootValidator(errors),
    new ResourceTypeValidator(errors),
    new RequriedResourcePropertyValidator(errors),
    new ResourcePropertyValidator(errors)
  ];
  const walker = new Walker(validators);
  walker.Root(yaml.load(template));
  return errors;
}
