function getDateTimestamp(value) {
  const russianDate = String(value ?? '').match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (russianDate) {
    const [, day, month, year] = russianDate;
    return new Date(year, Number(month) - 1, day).getTime();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function matchesComparison(actualValue, operator, expectedValue) {
  const expectedNumber = Number(expectedValue);

  if (!Number.isFinite(expectedNumber)) return false;

  const comparisons = {
    eq: actualValue === expectedNumber,
    gt: actualValue > expectedNumber,
    lt: actualValue < expectedNumber,
    gte: actualValue >= expectedNumber,
    lte: actualValue <= expectedNumber
  };

  return comparisons[operator] || false;
}

function matchesCondition(customer, condition) {
  if (condition.field === 'visits') {
    const visitsCount = customer.events.filter(
      (event) => event.type === 'Посещение'
    ).length;

    return matchesComparison(visitsCount, condition.operator, condition.value);
  }

  if (condition.field === 'totalSpent') {
    return matchesComparison(
      customer.totalSpent,
      condition.operator,
      condition.value
    );
  }

  if (condition.field === 'eventType') {
    return customer.events.some(
      (event) => event.type === condition.value
    );
  }

  if (condition.field === 'tenant') {
    return customer.tenants.includes(condition.value);
  }

  if (condition.field === 'activityPeriod') {
    const periodStart = Date.now() - Number(condition.value) * 86400000;

    return customer.events.some((event) => {
      const timestamp = getDateTimestamp(event.date);
      return timestamp && timestamp >= periodStart;
    });
  }

  return false;
}

export function getSegmentCustomers(customers, conditions) {
  return customers.filter((customer) =>
    conditions.every((condition) => matchesCondition(customer, condition))
  );
}
