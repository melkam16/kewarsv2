// src/components/Pages/Reports.js
import React, { useContext } from "react";
import { Paper, Box, Button, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import withProtectedRoute from "../common/ProtectedRoute";
import { AuthContext } from "../contexts/AuthContext";
import config from "../../config";

import buildState from "../../search/buildState";
import SearchResults from "../search/SearchResults";

import {
  SearchProvider,
  SearchBox,
  Facet,
  Sorting,
  WithSearch,
  ErrorBoundary,
  PagingInfo,
  ResultsPerPage,
  Paging,
} from "@elastic/react-search-ui";
import { Layout, MultiCheckboxFacet } from "@elastic/react-search-ui-views";

import "./Reports.css";

import API_BASE from '../../api/apiBase';

const sortOptions = [
  { name: "Relevance", value: "", direction: "" },
  { name: "Incident Date Oldest 1st", value: "incident_datetime", direction: "asc" },
  { name: "Incident Date Newest 1st", value: "incident_datetime", direction: "desc" },
  { name: "Report Date Oldest 1st", value: "created_at", direction: "asc" },
  { name: "Report Date Newest 1st", value: "created_at", direction: "desc" },
];

function Reports() {
  const { token, userRoles } = useContext(AuthContext);
  const navigate = useNavigate();

  const mapFilters = (searchState) => {
    if (!searchState.filters) return [];
    return searchState.filters.map((f) => ({
      field: f.field,
      values: f.values.map((v) => (v && typeof v === "object" && "value" in v ? v.value : v)),
      type: "any",
    }));
  };

  const formatFacets = (aggregations) => {
    if (!aggregations) return {};
    const facets = {};

    const fields = ["byRegion", "categories", "status", "severity", "incidentDateTime"];
    fields.forEach((field) => {
      if (aggregations[field] && aggregations[field].buckets) {
        facets[field] = [
          {
            field: field,
            type: "value",
            data: aggregations[field].buckets.map((b) => ({
              value: b.key || "Unknown",
              count: b.doc_count || 0,
            })),
          },
        ];
      } else {
        facets[field] = [
          {
            field: field,
            type: "value",
            data: [],
          },
        ];
      }
    });

    return facets;
  };

  const getReports = async (searchState) => {
    try {
      const response = await fetch(`${API_BASE}/search/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: searchState.current || 1,
          resultsPerPage: searchState.resultsPerPage || 10,
          filters: mapFilters(searchState),
          sortField: searchState.sortField,
          sortDirection: searchState.sortDirection,
        }),
      });

      const result = await response.json();
      if (!result || !result.results) {
        throw new Error(result?.error || result?.message || "Failed to search reports");
      }

      const mappedResults = result.results.map((r) => {
        const data = r.data || {};
        return {
          id: { raw: r.id },
          reportId: { raw: `rep-${r.id}` },
          title: { raw: data.title || r.title || `Report ${r.id}` },
          description: { raw: data.description || r.description || "" },
          status: { raw: r.status || data.status || "unprocessed" },
          severity: { raw: r.severity || data.severity || "low" },
          categories: { raw: r.categories || data.categories || [] },
          incidentLocation: {
            raw: {
              region: r.region || data.incidentLocation?.region || "",
              zone: r.zone || data.incidentLocation?.zone || "",
              woreda: r.woreda || data.incidentLocation?.woreda || "",
              other: data.incidentLocation?.other || "",
            },
          },
          incidentDateTime: {
            raw: r.incident_datetime
              ? new Date(r.incident_datetime).toISOString()
              : data.incidentDateTime || new Date().toISOString(),
          },
          incidentGps: { raw: data.incidentGps || { lat: 9.145, lon: 40.4896 } },
          hasMedia: { raw: (data.mediaFiles && data.mediaFiles.length > 0) || false },
          combinedReport: { raw: data.combinedReport || false },
          sourceReports: { raw: data.sourceReports || [] },
        };
      });

      return {
        results: mappedResults,
        totalResults: result.total,
        totalPages: Math.ceil(result.total / (searchState.resultsPerPage || 10)),
        facets: formatFacets(result.aggregations),
      };
    } catch (err) {
      console.error("Search error:", err);
      return {
        results: [],
        totalResults: 0,
        totalPages: 0,
        facets: {},
      };
    }
  };

  const configurationOptions = {
    trackUrlState: true,
    alwaysSearchOnInitialLoad: true,
    onSearch: async (searchState) => getReports(searchState),
  };

  return (
    <Paper className="reports" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Reports
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/reports/create")}
          sx={{ borderRadius: "8px", fontWeight: 700 }}
        >
          Create Report
        </Button>
      </Box>

      <SearchProvider config={configurationOptions}>
        <WithSearch mapContextToProps={({ 
          wasSearched, 
          results, 
          filters, 
          setFilter, 
          removeFilter, 
          facets,
          sortField,
          sortDirection,
          setSort
        }) => ({ 
          wasSearched, 
          results, 
          filters, 
          setFilter, 
          removeFilter, 
          facets,
          sortField,
          sortDirection,
          setSort
        })}>
          {({ 
            wasSearched, 
            results, 
            filters, 
            setFilter, 
            removeFilter, 
            facets,
            sortField,
            sortDirection,
            setSort
          }) => {
            const getActiveValue = (field) => {
              const filter = filters ? filters.find(f => f.field === field) : null;
              return filter && filter.values && filter.values.length > 0 ? filter.values[0] : "";
            };

            const handleChange = (field, value) => {
              if (value === "") {
                removeFilter(field);
              } else {
                setFilter(field, value, "any");
              }
            };

            const getSortValue = () => {
              if (!sortField) return "";
              return `${sortField}|||${sortDirection}`;
            };

            const handleSortChange = (value) => {
              if (!value) {
                setSort("", "");
              } else {
                const [field, direction] = value.split("|||");
                setSort(field, direction);
              }
            };

            return (
              <div className="search">
                <ErrorBoundary>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                    <SearchBox />
                    
                    {wasSearched && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mt: 1, p: 2, bgcolor: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                        
                        {/* Region Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: "#ffffff" }}>
                          <InputLabel id="region-filter-label">Region</InputLabel>
                          <Select
                            labelId="region-filter-label"
                            id="region-filter"
                            value={getActiveValue("byRegion")}
                            label="Region"
                            onChange={(e) => handleChange("byRegion", e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value=""><em>All Regions</em></MenuItem>
                            {(facets?.byRegion?.[0]?.data || []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {config.locations[opt.value]?.label.en || opt.value} ({opt.count})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Year Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 120, bgcolor: "#ffffff" }}>
                          <InputLabel id="year-filter-label">Year</InputLabel>
                          <Select
                            labelId="year-filter-label"
                            id="year-filter"
                            value={getActiveValue("incidentDateTime")}
                            label="Year"
                            onChange={(e) => handleChange("incidentDateTime", e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value=""><em>All Years</em></MenuItem>
                            {(facets?.incidentDateTime?.[0]?.data || []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.value} ({opt.count})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Category Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: "#ffffff" }}>
                          <InputLabel id="category-filter-label">Category</InputLabel>
                          <Select
                            labelId="category-filter-label"
                            id="category-filter"
                            value={getActiveValue("categories")}
                            label="Category"
                            onChange={(e) => handleChange("categories", e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value=""><em>All Categories</em></MenuItem>
                            {(facets?.categories?.[0]?.data || []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {config.categories[opt.value]?.label.en || opt.value} ({opt.count})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Severity Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 130, bgcolor: "#ffffff" }}>
                          <InputLabel id="severity-filter-label">Severity</InputLabel>
                          <Select
                            labelId="severity-filter-label"
                            id="severity-filter"
                            value={getActiveValue("severity")}
                            label="Severity"
                            onChange={(e) => handleChange("severity", e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value=""><em>All Severities</em></MenuItem>
                            {(facets?.severity?.[0]?.data || []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)} ({opt.count})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Status Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 130, bgcolor: "#ffffff" }}>
                          <InputLabel id="status-filter-label">Status</InputLabel>
                          <Select
                            labelId="status-filter-label"
                            id="status-filter"
                            value={getActiveValue("status")}
                            label="Status"
                            onChange={(e) => handleChange("status", e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value=""><em>All Statuses</em></MenuItem>
                            {(facets?.status?.[0]?.data || []).map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)} ({opt.count})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Sorting Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 200, bgcolor: "#ffffff", ml: "auto" }}>
                          <InputLabel id="sort-filter-label">Sort By</InputLabel>
                          <Select
                            labelId="sort-filter-label"
                            id="sort-filter"
                            value={getSortValue()}
                            label="Sort By"
                            onChange={(e) => handleSortChange(e.target.value)}
                            sx={{ borderRadius: "8px" }}
                          >
                            {sortOptions.map((opt) => {
                              const val = opt.value ? `${opt.value}|||${opt.direction}` : "";
                              return (
                                <MenuItem key={val} value={val}>
                                  {opt.name}
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>

                        {/* Clear Filters Button */}
                        {filters && filters.length > 0 && (
                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            onClick={() => {
                              filters.forEach((f) => removeFilter(f.field));
                            }}
                            sx={{ fontWeight: 700, textTransform: "none" }}
                          >
                            Clear
                          </Button>
                        )}

                      </Box>
                    )}

                    {/* Pagination Header (PagingInfo, ResultsPerPage) */}
                    {wasSearched && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                        <PagingInfo />
                        <ResultsPerPage options={[10, 20, 50]} />
                      </Box>
                    )}

                    {/* Search Results Catalog/Map */}
                    <Box sx={{ width: "100%", mt: 1 }}>
                      <SearchResults results={results} token={token} userRoles={userRoles} />
                    </Box>

                    {/* Pagination Footer */}
                    {wasSearched && (
                      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                        <Paging />
                      </Box>
                    )}
                  </Box>
                </ErrorBoundary>
              </div>
            );
          }}
        </WithSearch>
      </SearchProvider>
    </Paper>
  );
}

// Wrap with role protection
export default function WrappedReports() {
  const { userRoles } = useContext(AuthContext);

  // Only 'analyst' and 'admin' can access Reports
  const ProtectedReports = withProtectedRoute(Reports);

  return <ProtectedReports userRoles={userRoles} pathRoles="analyst,admin" />;
}