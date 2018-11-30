import {load, dump, Ref, GetAtt, CfnFn} from '../yaml';

describe('load', () => {
  test('with ref', () => {
    const expected = {
      foo: new Ref('bar', 'YAML')
    };
    expect(load('foo: !Ref bar')).toEqual(expected);
  });
});

describe('dump', () => {
  test('with YAML style', () => {
    const input = {
      foo: new Ref('bar', 'YAML')
    };
    expect(dump(input)).toEqual('foo: !Ref bar\n');
  });

  test('with JSON style', () => {
    const input = {
      foo: new Ref('bar', 'JSON')
    };
    expect(dump(input)).toEqual('foo:\n  Ref: bar\n');
  });
})

describe('GetAtt', () => {
  test('instanceof', () => {
    const getAtt = new GetAtt('a', 'YAML');
    expect(getAtt instanceof CfnFn).toBeTruthy();
  });
});
