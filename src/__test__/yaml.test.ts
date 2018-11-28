import {load, dump, Ref} from '../yaml';

describe('load', () => {
  test('with ref', () => {
    const expected = {
      foo: new Ref('bar')
    };
    expect(load('foo: !Ref bar')).toEqual(expected);
  });
});

describe('dump', () => {
  test('with ref', () => {
    const input = {
      foo: new Ref('bar')
    };
    expect(dump(input)).toEqual('foo: !Ref bar\n');
  });
})
