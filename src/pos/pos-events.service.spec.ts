import {
  BUSY_WINDOW_MS,
  ONLINE_WINDOW_MS,
  PosEvent,
  PosEventsService,
} from './pos-events.service';

describe('PosEventsService', () => {
  let service: PosEventsService;
  let heard: PosEvent[];

  beforeEach(() => {
    jest.useFakeTimers();
    service = new PosEventsService();
    heard = [];
    service.subscribe('c1', (event) => heard.push(event));
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('announces a register once when it starts speaking', () => {
    service.seen('d1', 'c1');
    service.seen('d1', 'c1');

    expect(heard).toEqual([{ type: 'device', deviceId: 'd1', online: true }]);
    expect(service.isOnline('d1')).toBe(true);
  });

  it('knows nothing about a register it has not heard from', () => {
    expect(service.isOnline('d1')).toBeUndefined();
  });

  it('keeps a register online for as long as it keeps asking', () => {
    service.seen('d1', 'c1');
    jest.advanceTimersByTime(ONLINE_WINDOW_MS - 1000);
    service.seen('d1', 'c1');
    jest.advanceTimersByTime(ONLINE_WINDOW_MS - 1000);

    expect(service.isOnline('d1')).toBe(true);
  });

  it('announces a register that has gone quiet', () => {
    service.seen('d1', 'c1');
    jest.advanceTimersByTime(ONLINE_WINDOW_MS + 1);

    expect(heard).toEqual([
      { type: 'device', deviceId: 'd1', online: true },
      { type: 'device', deviceId: 'd1', online: false },
    ]);
    expect(service.isOnline('d1')).toBe(false);
  });

  it('notices within seconds a register that hung up', () => {
    service.seen('d1', 'c1');
    service.hungUp('d1');
    jest.advanceTimersByTime(5000);

    expect(service.isOnline('d1')).toBe(false);
  });

  it('forgives a register that hung up and called straight back', () => {
    service.seen('d1', 'c1');
    service.hungUp('d1');
    jest.advanceTimersByTime(1000);
    service.seen('d1', 'c1');
    jest.advanceTimersByTime(10_000);

    expect(service.isOnline('d1')).toBe(true);
    expect(heard).toHaveLength(1);
  });

  it('does not write off a register while the customer is paying', () => {
    service.seen('d1', 'c1', BUSY_WINDOW_MS);
    jest.advanceTimersByTime(ONLINE_WINDOW_MS * 2);

    expect(service.isOnline('d1')).toBe(true);
  });

  it('tells only the screens of the same company', () => {
    const other: PosEvent[] = [];
    service.subscribe('c2', (event) => other.push(event));

    service.seen('d1', 'c1');

    expect(other).toEqual([]);
  });

  it('stops telling a screen that has closed', () => {
    const closed: PosEvent[] = [];
    const unsubscribe = service.subscribe('c1', (event) => closed.push(event));
    unsubscribe();

    service.seen('d1', 'c1');

    expect(closed).toEqual([]);
  });
});
