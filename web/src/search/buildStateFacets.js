function getValueFacet(aggregations, fieldName) {
  if (
    aggregations &&
    aggregations[fieldName]) {
    if (
      Array.isArray(aggregations[fieldName].buckets) && aggregations[fieldName].buckets.length
    ) {
      return [
        {
          field: fieldName,
          type: "value",
          data: aggregations[fieldName].buckets.map(bucket => ({
            // Boolean values and date values require using `key_as_string`
            value: bucket.key_as_string || bucket.key,
            count: bucket.doc_count
          }))
        }
      ];
    } 
    else if (      
      Object.keys(aggregations[fieldName].buckets) > 0 // filter buckets are objects
    ) {
      return [
        {
          field: fieldName,
          type: "value",
          data: Object.keys(aggregations[fieldName].buckets).map(bucket => ({            
            value: bucket,
            count: aggregations[fieldName].buckets[bucket].doc_count
          }))
        }
      ];
    }
  }
}

function getBooleanFacet(aggregations, fieldName) {
  if (
    aggregations &&
    aggregations[fieldName] &&
    aggregations[fieldName].buckets &&
    aggregations[fieldName].buckets.length > 0
  ) {
    return [
      {
        field: fieldName,
        type: "boolean",
        data: aggregations[fieldName].buckets.map(bucket => ({
          // Boolean values and date values require using `key_as_string`
          value: bucket.key_as_string || bucket.key,
          count: bucket.doc_count
        }))
      }
    ];
  }
}

function getRangeFacet(aggregations, fieldName) {
  if (
    aggregations &&
    aggregations[fieldName] &&
    aggregations[fieldName].buckets &&
    aggregations[fieldName].buckets.length > 0
  ) {
    return [
      {
        field: fieldName,
        type: "range",
        data: aggregations[fieldName].buckets.map(bucket => ({
          // Boolean values and date values require using `key_as_string`
          value: {
            to: bucket.to,
            from: bucket.from,
            name: bucket.key
          },
          count: bucket.doc_count
        }))
      }
    ];
  }
}

export default function buildStateFacets(aggregations) {
  const status = getValueFacet(aggregations, "status");
  const hasMedia = getValueFacet(aggregations, "hasMedia");
  const isCombined = getValueFacet(aggregations, "combinedReport");
  const byRegion = getValueFacet(aggregations, "byRegion");
  const incidentDateTime = getRangeFacet(aggregations, "incidentDateTime");
  const categories = getValueFacet(aggregations, "categories");

  const facets = {
    ...(byRegion && { byRegion }),
    ...(status && { status }),
    ...(incidentDateTime && { incidentDateTime }),
    ...(categories && { categories }),
    ...(hasMedia && { hasMedia }),
    ...(isCombined && { isCombined }),
  };

  if (Object.keys(facets).length > 0) {
    return facets;
  }
}