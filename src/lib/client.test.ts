/** NOTE: Testing in this file is designed to test both the client and it's interaction with default Exchanges */
import { createClient } from './client';
import { CombinedError } from './';
import {
  queryGql,
  mutationGql,
  queryResponse,
  subscriptionGql,
} from '../test-utils';
import { ClientInstance } from '../types';

const url = 'https://hostname.com';
const fetch = (global as any).fetch as jest.Mock;
const onSubscriptionUpdate = jest.fn();

const wait = (delay: number = 90) =>
  new Promise(resolve => setTimeout(resolve, delay));

describe('createClient', () => {
  it('passes snapshot', () => {
    const client = createClient({
      url,
    });

    expect(client).toMatchSnapshot();
  });

  it("returns an object with 'createInstance' function", () => {
    const client = createClient({
      url,
    });
    expect(typeof client.createInstance).toBe('function');
  });

  describe('args', () => {
    describe('fetchOptions', () => {
      const onChange = jest.fn();
      const fetchOptions = jest.fn();
      const options = {
        headers: {
          'x-special-header': '1234',
        },
      };

      beforeEach(() => {
        fetch.mockClear();
        fetchOptions.mockClear();
        fetchOptions.mockReturnValue(options);
        fetch.mockResolvedValue({
          status: 200,
          json: () => ({
            status: 200,
            data: queryResponse.data,
          }),
        });
      });

      it('function is executed', () => {
        createClient({
          url,
          fetchOptions: fetchOptions as any,
        });

        expect(fetchOptions).toBeCalled();
      });

      it('object is passed to fetch', async () => {
        const client = createClient({
          url,
          fetchOptions: fetchOptions as any,
        }).createInstance({ onChange, onSubscriptionUpdate });

        client.executeQuery(queryGql);

        await wait();
        expect(fetch.mock.calls[0][1]).toHaveProperty(
          'headers.x-special-header',
          options.headers['x-special-header']
        );
        client.unsubscribe();
      });
    });

    describe('url', () => {
      const onChange = jest.fn();

      beforeEach(() => {
        fetch.mockClear();
      });

      it('is passed to fetch', async () => {
        const client = createClient({
          url,
        }).createInstance({ onChange, onSubscriptionUpdate });

        client.executeQuery(queryGql);

        await wait();
        expect(fetch.mock.calls[0][0]).toBe(url);
        client.unsubscribe();
      });
    });
  });
});

describe('createInstance', () => {
  const onChange = jest.fn();
  const client = createClient({
    url,
  });

  it('passes snapshot', () => {
    const instance = client.createInstance({ onChange, onSubscriptionUpdate });
    expect(instance).toMatchSnapshot();
  });
});

describe('executeQuery', () => {
  const onChange = jest.fn();
  let client: ClientInstance;

  beforeEach(() => {
    client = createClient({
      url,
    }).createInstance({ onChange, onSubscriptionUpdate });
    fetch.mockClear();
    onChange.mockClear();
    fetch.mockResolvedValue({
      status: 200,
      json: () => ({
        status: 200,
        data: queryResponse.data,
      }),
    });
  });

  afterEach(() => {
    client.unsubscribe();
  });

  describe('on call', () => {
    it('calls fetch', () => {
      client.executeQuery(queryGql);
      expect(fetch).toBeCalled();
    });

    it('calls onChange with fetching=true', () => {
      client.executeQuery(queryGql);
      expect(onChange).toBeCalledWith(
        expect.objectContaining({ fetching: true })
      );
    });
  });

  describe('on data', () => {
    describe('calls onChange with', () => {
      it('matching snapshot', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toMatchSnapshot();
      });

      it('fetching = false', async () => {
        const data = { users: [{ name: 'john' }] };
        fetch.mockResolvedValue({
          status: 200,
          json: () => ({
            status: 200,
            data,
          }),
        });

        client.executeQuery(queryGql);

        await wait();
        expect(onChange).toBeCalledWith(
          expect.objectContaining({ fetching: false })
        );
      });

      it('data', async () => {
        const data = { users: [{ name: 'john' }] };
        fetch.mockResolvedValue({
          status: 200,
          json: () => ({
            status: 200,
            data,
          }),
        });

        client.executeQuery(queryGql);

        await wait();
        expect(onChange).toBeCalledWith(expect.objectContaining({ data }));
      });
    });
  });

  describe('on network error', () => {
    describe('calls onChange with', () => {
      beforeEach(() => {
        fetch.mockResolvedValue({
          status: 400,
        });
      });

      it('matching snapshot', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toMatchSnapshot();
      });

      it('HTTP status code', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toHaveProperty(
          'error.response.status',
          400
        );
      });

      it('network error', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toHaveProperty('error.networkError');
      });

      it('fetching = false', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toHaveProperty('fetching', false);
      });
    });
  });

  describe('on graphql error', () => {
    const errors = [{ message: 'error 1 message' }];

    describe('calls onChange with', () => {
      beforeEach(() => {
        fetch.mockResolvedValue({
          status: 200,
          json: () => ({
            errors,
            data: undefined,
          }),
        });
      });

      it('matching snapshot', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toMatchSnapshot();
      });

      it('graphql errors', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0].error.graphQLErrors[0]).toHaveProperty(
          'message',
          errors[0].message
        );
      });

      it('fetching = false', async () => {
        client.executeQuery(queryGql);

        await wait();
        expect(onChange.mock.calls[1][0]).toHaveProperty('fetching', false);
      });
    });
  });
});

describe('execute mutation', () => {
  const onChange = jest.fn();
  let client: ClientInstance;

  beforeEach(async () => {
    client = createClient({
      url,
    }).createInstance({ onChange, onSubscriptionUpdate });

    fetch.mockResolvedValue({
      status: 200,
      json: () => ({
        status: 200,
        data: [],
      }),
    });

    client.executeQuery(queryGql);
    await wait();

    fetch.mockClear();
    onChange.mockClear();
  });

  afterEach(() => {
    client.unsubscribe();
  });

  describe('on call', () => {
    it('calls fetch', async () => {
      client.executeMutation(mutationGql);

      await wait();
      expect(fetch).toBeCalled();
    });
  });
});

describe('execute subscription', () => {
  const forwardSubscription = jest.fn((operation, observer) =>
    observer.next({ data: { data: 'foo' }, operation, error: null })
  );

  const client = createClient({
    url,
    forwardSubscription,
  }).createInstance({ onChange: jest.fn(), onSubscriptionUpdate });

  beforeEach(() => {
    forwardSubscription.mockClear();
    onSubscriptionUpdate.mockClear();
  });

  it('calls through the subscription exchange', () => {
    client.executeSubscription(subscriptionGql);

    expect(forwardSubscription).toHaveBeenCalled();
  });

  it('transform gql errors into CombinedError', () => {
    forwardSubscription.mockImplementationOnce((operation, observer) =>
      observer.next({
        data: { data: null, errors: [{ name: 'An Error' }] },
        operation,
      })
    );

    client.executeSubscription(subscriptionGql);

    expect(onSubscriptionUpdate.mock.calls[0][0].error).toBeInstanceOf(
      CombinedError
    );
  });

  it('calls through to the onSubscriptionUpdate', () => {
    client.executeSubscription(subscriptionGql);

    expect(onSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'foo' })
    );
  });
});

describe('execute unsubscribe subscription', () => {
  const unsubscribe = jest.fn();

  const forwardSubscription = jest.fn(() => {
    return { unsubscribe };
  });

  const client = createClient({
    url,
    forwardSubscription,
  }).createInstance({ onChange: jest.fn(), onSubscriptionUpdate });

  beforeEach(() => {
    forwardSubscription.mockClear();
    onSubscriptionUpdate.mockClear();
    client.executeSubscription(subscriptionGql);
  });

  it('calls the unsubscribe fn from the exchange library', () => {
    client.executeUnsubscribeSubscription(subscriptionGql);

    expect(unsubscribe).toHaveBeenCalled();
  });
});
