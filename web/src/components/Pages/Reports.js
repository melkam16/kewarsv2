// src/components/Pages/Reports.js
import React, { useContext } from "react";
import { Paper, Box, Button, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import withProtectedRoute from "../common/ProtectedRoute";
import { AuthContext } from "../contexts/AuthContext";

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
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const mapFilters = (searchState) => {
    if (!searchState.filters) return [];
    return searchState.filters.map((f) => ({
      field: f.field,
      values: f.values.map((v) => v.value),
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
        <WithSearch mapContextToProps={({ wasSearched, results }) => ({ wasSearched, results })}>
          {({ wasSearched, results }) => (
            <div className="search">
              <ErrorBoundary>
                <Layout
                  header={<SearchBox />}
                  sideContent={
                    <div>
                      {wasSearched && <Sorting sortOptions={sortOptions} />}
                      <Facet field="byRegion" label="Reports by Region" filterType="any" view={MultiCheckboxFacet} />
                      <Facet field="categories" label="Categories" filterType="any" view={MultiCheckboxFacet} />
                      <Facet field="status" label="Status" filterType="any" />
                      <Facet field="incidentDateTime" label="Incident Date" filterType="any" />
                      <Facet field="severity" label="Severity" filterType="any" />
                    </div>
                  }
                  bodyContent={<SearchResults results={results} />}
                  bodyHeader={
                    <>
                      {wasSearched && <PagingInfo />}
                      {wasSearched && <ResultsPerPage options={[10, 20, 50]} />}
                    </>
                  }
                  bodyFooter={<Paging />}
                />
              </ErrorBoundary>
            </div>
          )}
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