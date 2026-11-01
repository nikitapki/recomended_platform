export const MIN_SOURCE_CUSTOMERS = 4;
export const MIN_CO_VISITORS = 3;

function getImportedTenantSet(customer) {
  return new Set(
    customer.events
      .filter((event) => event.importEventId && event.tenant)
      .map((event) => event.tenant)
  );
}

function getPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function buildRecommendations(customers) {
  const tenantCustomers = new Map();
  const pairCustomers = new Map();
  const customerTenantSets = new Map();

  customers.forEach((customer) => {
    const tenants = getImportedTenantSet(customer);
    customerTenantSets.set(customer.id, tenants);

    tenants.forEach((tenant) => {
      if (!tenantCustomers.has(tenant)) tenantCustomers.set(tenant, new Set());
      tenantCustomers.get(tenant).add(customer.id);
    });

    tenants.forEach((sourceTenant) => {
      tenants.forEach((targetTenant) => {
        if (sourceTenant === targetTenant) return;

        const pairKey = `${sourceTenant}\u0000${targetTenant}`;
        if (!pairCustomers.has(pairKey)) pairCustomers.set(pairKey, new Set());
        pairCustomers.get(pairKey).add(customer.id);
      });
    });
  });

  const recommendations = [];

  pairCustomers.forEach((coVisitedCustomerIds, pairKey) => {
    const [sourceTenant, targetTenant] = pairKey.split('\u0000');
    const sourceCustomerIds = tenantCustomers.get(sourceTenant) || new Set();
    const sourceCustomersCount = sourceCustomerIds.size;
    const coVisitedCustomersCount = coVisitedCustomerIds.size;

    if (
      sourceCustomersCount < MIN_SOURCE_CUSTOMERS ||
      coVisitedCustomersCount < MIN_CO_VISITORS
    ) {
      return;
    }

    const potentialCustomers = customers.filter((customer) => {
      const importedTenants = customerTenantSets.get(customer.id) || new Set();

      return (
        importedTenants.has(sourceTenant) &&
        !customer.tenants.includes(targetTenant)
      );
    });

    if (potentialCustomers.length === 0) return;

    const strength = getPercent(
      coVisitedCustomersCount,
      sourceCustomersCount
    );
    const relevanceRate = getPercent(
      potentialCustomers.length,
      sourceCustomersCount
    );
    const support = getPercent(coVisitedCustomersCount, customers.length);

    recommendations.push({
      id: `${sourceTenant}-${targetTenant}`,
      sourceTenant,
      targetTenant,
      sourceCustomersCount,
      coVisitedCustomersCount,
      potentialCustomers,
      potentialCustomersCount: potentialCustomers.length,
      strength,
      relevanceRate,
      support,
      explanation: `${coVisitedCustomersCount} из ${sourceCustomersCount} гостей ${sourceTenant} также взаимодействовали с ${targetTenant}.`
    });
  });

  return recommendations.sort((left, right) => {
    if (right.potentialCustomersCount !== left.potentialCustomersCount) {
      return right.potentialCustomersCount - left.potentialCustomersCount;
    }

    return right.strength - left.strength;
  });
}

export function getRecommendationStats(customers, recommendations) {
  const customersWithImportedEvents = customers.filter(
    (customer) => getImportedTenantSet(customer).size > 0
  ).length;
  const importedTenants = new Set();

  customers.forEach((customer) => {
    getImportedTenantSet(customer).forEach((tenant) => importedTenants.add(tenant));
  });

  return {
    audienceCustomersCount: customers.length,
    customersWithImportedEvents,
    importedTenantsCount: importedTenants.size,
    recommendationsCount: recommendations.length,
    hasMinimumData: customersWithImportedEvents >= MIN_SOURCE_CUSTOMERS &&
      importedTenants.size >= 2
  };
}
