import { apiFetch } from './tenantContext.jsx';

function sortRecords(records, sort) {
  if (!sort || !sort.field) return records;
  const { field, order } = sort;
  const multiplier = order === 'DESC' ? -1 : 1;

  return [...records].sort((a, b) => {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * multiplier;
    }
    return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  });
}

function paginateRecords(records, pagination) {
  if (!pagination || !pagination.page || !pagination.perPage) return records;
  const { page, perPage } = pagination;
  const start = (page - 1) * perPage;
  return records.slice(start, start + perPage);
}

async function fetchMappedResource(resource, queryFilter = '') {
  if (resource === 'submissions') {
    const data = await apiFetch('/api/submissions');
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.submsnId ?? item.id
    }));
  }

  if (resource === 'policies') {
    const data = await apiFetch('/api/policies');
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.policyId ?? item.id
    }));
  }

  if (resource === 'quotes') {
    const data = await apiFetch('/api/quotes');
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.quoteId ?? item.id
    }));
  }

  if (resource === 'claims') {
    const data = await apiFetch('/api/claims');
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.claimId ?? item.id
    }));
  }

  if (resource === 'documents') {
    try {
      const data = await apiFetch('/api/documents');
      return (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        id: item.documentId ?? item.docId ?? item.id
      }));
    } catch {
      return [];
    }
  }

  if (resource === 'inbox' || resource === 'incoming') {
    try {
      const data = await apiFetch('/api/documents/incoming');
      return (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        id: item.incomingId ?? item.id
      }));
    } catch {
      return [];
    }
  }

  if (resource === 'forms') {
    return [
      { id: 1, formCode: 'ACORD-125', formName: 'Commercial Insurance Application', category: 'General Liability', version: '2025.1', status: 'Active' },
      { id: 2, formCode: 'ACORD-126', formName: 'Commercial General Liability Section', category: 'General Liability', version: '2025.1', status: 'Active' },
      { id: 3, formCode: 'ACORD-140', formName: 'Property Section Application', category: 'Commercial Property', version: '2024.3', status: 'Active' },
      { id: 4, formCode: 'ACORD-130', formName: 'Workers Compensation Application', category: 'Workers Comp', version: '2025.2', status: 'Active' },
      { id: 5, formCode: 'HELIOS-SOV-01', formName: 'Schedule of Values & Loss History', category: 'Property', version: '2026.1', status: 'Active' }
    ];
  }

  if (resource === 'parties') {
    const url = queryFilter
      ? `/api/parties?q=${encodeURIComponent(queryFilter)}`
      : '/api/parties';
    const data = await apiFetch(url);
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.id,
      orgName: item.name
    }));
  }

  if (resource === 'tenants') {
    const data = await apiFetch('/api/tenants');
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      id: item.tenantId
    }));
  }

  return [];
}

export const dataProvider = {
  getList: async (resource, params) => {
    const { filter = {}, sort, pagination } = params || {};

    if (resource === 'parties') {
      const q = filter.q ?? filter.name ?? '';
      let records = await fetchMappedResource('parties', q);

      if (filter.id != null) {
        records = records.filter((r) => Number(r.id) === Number(filter.id));
      }

      const sorted = sortRecords(records, sort);
      return {
        data: paginateRecords(sorted, pagination),
        total: sorted.length
      };
    }

    let records = await fetchMappedResource(resource);

    if (resource === 'submissions') {
      if (filter.q) {
        const qLower = String(filter.q).toLowerCase().trim();
        records = records.filter(
          (r) =>
            String(r.submsnNbr).toLowerCase().includes(qLower) ||
            String(r.orgName).toLowerCase().includes(qLower) ||
            String(r.submsnId).includes(qLower) ||
            String(r.insuredPid).includes(qLower)
        );
      }
      if (filter.insuredPid != null && filter.insuredPid !== '') {
        records = records.filter((r) => Number(r.insuredPid) === Number(filter.insuredPid));
      }
    }

    if (resource === 'tenants' && filter.q) {
      const qLower = String(filter.q).toLowerCase().trim();
      records = records.filter(
        (r) =>
          String(r.tenantName).toLowerCase().includes(qLower) ||
          String(r.dbCatalogName).toLowerCase().includes(qLower) ||
          String(r.dbServerName).toLowerCase().includes(qLower) ||
          String(r.tenantId).includes(qLower)
      );
    }

    const sorted = sortRecords(records, sort);
    return {
      data: paginateRecords(sorted, pagination),
      total: sorted.length
    };
  },

  getOne: async (resource, params) => {
    const records = await fetchMappedResource(resource);
    const match = records.find((r) => String(r.id) === String(params.id));
    if (!match) {
      throw new Error(`${resource} record #${params.id} not found`);
    }
    return { data: match };
  },

  getMany: async (resource, params) => {
    const records = await fetchMappedResource(resource);
    const idSet = new Set((params.ids || []).map((id) => String(id)));
    return {
      data: records.filter((r) => idSet.has(String(r.id)))
    };
  },

  getManyReference: async (resource, params) => {
    const { target, id, filter = {}, sort, pagination } = params;
    let records = await fetchMappedResource(resource);
    records = records.filter((r) => String(r[target]) === String(id));

    if (filter.q) {
      const qLower = String(filter.q).toLowerCase().trim();
      records = records.filter(
        (r) =>
          String(r.submsnNbr || '').toLowerCase().includes(qLower) ||
          String(r.orgName || '').toLowerCase().includes(qLower)
      );
    }

    const sorted = sortRecords(records, sort);
    return {
      data: paginateRecords(sorted, pagination),
      total: sorted.length
    };
  },

  create: async (resource, params) => {
    const { data } = params;

    if (resource === 'submissions') {
      const partyId = Number(data.partyId ?? data.insuredPid);
      if (!partyId) {
        throw new Error('Please select a valid Organization (Party).');
      }
      const created = await apiFetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({ partyId })
      });
      return {
        data: {
          ...created,
          id: created.submsnId
        }
      };
    }

    if (resource === 'parties') {
      const orgName = String(data.orgName ?? data.name ?? '').trim();
      if (!orgName) {
        throw new Error('Organization Name cannot be empty.');
      }
      const created = await apiFetch('/api/parties', {
        method: 'POST',
        body: JSON.stringify({ orgName })
      });
      return {
        data: {
          ...created,
          id: created.id,
          orgName: created.name
        }
      };
    }

    if (resource === 'tenants') {
      const payload = {
        tenantId: Number(data.tenantId),
        tenantName: String(data.tenantName ?? '').trim(),
        dbServerName: String(data.dbServerName ?? '').trim(),
        dbCatalogName: String(data.dbCatalogName ?? '').trim()
      };
      const saved = await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return {
        data: {
          ...saved,
          id: saved.tenantId
        }
      };
    }

    throw new Error(`Create not supported for resource: ${resource}`);
  },

  update: async (resource, params) => {
    if (resource === 'tenants') {
      const { data } = params;
      const payload = {
        tenantId: Number(data.tenantId ?? params.id),
        tenantName: String(data.tenantName ?? '').trim(),
        dbServerName: String(data.dbServerName ?? '').trim(),
        dbCatalogName: String(data.dbCatalogName ?? '').trim()
      };
      const saved = await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return {
        data: {
          ...saved,
          id: saved.tenantId
        }
      };
    }
    throw new Error(`Update not supported for resource: ${resource}`);
  },

  updateMany: async () => ({ data: [] }),
  delete: async () => ({ data: {} }),
  deleteMany: async () => ({ data: [] }),

  getDiagnostics: async () => {
    return apiFetch('/api/diagnostics');
  }
};

