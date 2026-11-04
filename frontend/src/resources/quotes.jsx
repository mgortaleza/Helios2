import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ExportButton,
  SearchInput,
  useRecordContext,
  useRefresh,
  Button as RaButton
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField as MuiTextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { apiFetch } from '../tenantContext.jsx';

const quoteFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Quote # or Insured..." />
];

/**
 * Top toolbar for the Quote List with a primary "Rate with Helios-Rules" action
 */
function QuoteListActions({ onOpenRateModal }) {
  return (
    <TopToolbar>
      <Button
        variant="contained"
        color="primary"
        startIcon={<CalculateIcon />}
        onClick={onOpenRateModal}
        sx={{ mr: 1, fontWeight: 700, textTransform: 'none' }}
      >
        Rate New Quote (Helios-Rules)
      </Button>
      <ExportButton />
    </TopToolbar>
  );
}

export function QuoteList(props) {
  const [openRateModal, setOpenRateModal] = useState(false);
  const refresh = useRefresh();

  return (
    <>
      <List
        resource="quotes"
        title="Quotes & Rating Center"
        filters={quoteFilters}
        actions={<QuoteListActions onOpenRateModal={() => setOpenRateModal(true)} />}
        perPage={25}
        sort={{ field: 'quoteId', order: 'DESC' }}
        {...props}
      >
        <Datagrid rowClick="show" bulkActionButtons={false}>
          <TextField source="quoteNbr" label="Quote #" sx={{ fontWeight: 700 }} />
          <TextField source="insuredName" label="Insured Organization" />
          <TextField source="productType" label="Selected Product" />
          <TextField source="ratePlanVersion" label="Associated Rating Plan" />
          <TextField
            source="calculatedPremium"
            label="Calculated Amount"
            sx={{ fontWeight: 800, color: '#047857', fontSize: '0.95rem' }}
          />
          <TextField source="quoteStatus" label="Status" />
        </Datagrid>
      </List>

      <HeliosRulesRateModal
        open={openRateModal}
        onClose={() => setOpenRateModal(false)}
        onSaved={() => {
          setOpenRateModal(false);
          refresh();
        }}
      />
    </>
  );
}

/**
 * Custom Show view displaying product, associated rating plan,
 * outputted facts, and calculated amount & rule execution trace.
 */
export function QuoteShow() {
  const navigate = useNavigate();

  return (
    <Show title="Quote Details">
      <QuoteShowLayout />
    </Show>
  );
}

function QuoteShowLayout() {
  const record = useRecordContext();
  if (!record) return null;

  let parsedFacts = null;
  if (record.factsJson) {
    try {
      parsedFacts = JSON.parse(record.factsJson);
    } catch (e) {
      parsedFacts = null;
    }
  }

  const traceLines = record.calcTrace
    ? record.calcTrace.split('\n').filter(Boolean)
    : [];

  return (
    <Box sx={{ p: 2, maxWidth: 1100 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Quote {record.quoteNbr || record.quoteId}
            </Typography>
            <Chip
              label={record.status || 'Quoted'}
              color={record.status === 'Quoted' || record.status === 'Accepted' ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Insured Organization: <strong>{record.insuredName || 'Insured Client'}</strong> • Submission #{record.submsnId || 'N/A'} • Generated {record.generated || '2026-11-04'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Helios-Rules Calculated Amount
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#047857' }}>
            {record.premium || record.calculatedPremium || '$0.00'}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Product & Associated Rating Plan Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardHeader
              title="Selected Product & Associated Rating Plan"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Selected Product:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {record.productName || record.productType || record.productCode || 'Technology Errors & Omissions'} ({record.productCode || 'TECH_EO'})
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Associated Rating Plan:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0284c7' }}>
                  {record.planName || 'Standard Commercial Rating Plan'} ({record.planCode || 'STANDARD'})
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  Filing Version: <strong>{record.ruleVersionId || 'v1.0.0'}</strong> • Engine: <strong>Standalone helios-rules Drools</strong>
                </Typography>
              </Box>

              <Divider />

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>State Jurisdiction:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.stateCode || 'CA'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Coverage Limit:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.limitAmt || '$2,000,000'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Retention / Deductible:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.retentionAmt || '$25,000'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Exposure Basis:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.exposureVal || '$5,000,000'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Helios-Rules Calculation Audit Trail Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
            <CardHeader
              title="Helios-Rules Drools Audit Trace"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
            />
            <CardContent>
              {traceLines.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {traceLines.map((line, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1,
                        backgroundColor: '#f1f5f9',
                        borderRadius: 1,
                        borderLeft: '4px solid #0284c7',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace'
                      }}
                    >
                      {line}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                  No execution trace recorded for this quote proposal.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Outputted Facts Section (Accordion) */}
        <Grid item xs={12}>
          <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FactCheckIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Facts Output by Helios2 for Helios-Rules Execution
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {parsedFacts ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    overflowX: 'auto'
                  }}
                >
                  <pre style={{ margin: 0 }}>{JSON.stringify(parsedFacts, null, 2)}</pre>
                </Paper>
              ) : (
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Facts JSON payload not stored or available.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * Interactive Dialog for Rating with the standalone Helios-Rules microservice.
 * - Underwriter selects Product
 * - UI displays Associated Rating Plan
 * - Facts are generated/customized
 * - User clicks "Rate with Helios-Rules" -> Helios2 outputs facts to helios-rules
 * - Returns and displays calculated amount & Drools rules trace
 * - One-click "Save & Create Quote"
 */
export function HeliosRulesRateModal({ open, onClose, onSaved, initialSubmsnId = null, initialInsuredName = '' }) {
  const [products, setProducts] = useState([]);
  const [selectedProductCode, setSelectedProductCode] = useState('TECH_EO');
  const [associatedPlan, setAssociatedPlan] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Facts form state
  const [stateCode, setStateCode] = useState('CA');
  const [exposureVal, setExposureVal] = useState('5000000');
  const [limitAmt, setLimitAmt] = useState('2000000');
  const [retentionAmt, setRetentionAmt] = useState('25000');
  const [submsnId, setSubmsnId] = useState(initialSubmsnId || '');
  const [retroYears, setRetroYears] = useState(5);
  const [claimFreeYears, setClaimFreeYears] = useState(6);
  const [claimsCount, setClaimsCount] = useState(0);
  const [defenseOutsideLimits, setDefenseOutsideLimits] = useState(false);
  const [specialtyClass, setSpecialtyClass] = useState('TECH_SAAS_EO');

  // Rating execution state
  const [isRating, setIsRating] = useState(false);
  const [ratingResult, setRatingResult] = useState(null);
  const [ratingError, setRatingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load products and associated rating plans on modal open
  useEffect(() => {
    if (!open) return;
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const data = await apiFetch('/api/products');
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          const first = data.find((p) => p.productCode === 'TECH_EO') || data[0];
          setSelectedProductCode(first.productCode);
          setAssociatedPlan(first.ratingPlan);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, [open]);

  // When product changes, update the associated rating plan and defaults
  const handleProductChange = (prodCode) => {
    setSelectedProductCode(prodCode);
    const prod = products.find((p) => p.productCode === prodCode);
    if (prod && prod.ratingPlan) {
      setAssociatedPlan(prod.ratingPlan);
      if (prod.ratingPlan.defaultLimitCents) {
        setLimitAmt(String(prod.ratingPlan.defaultLimitCents / 100));
      }
      if (prod.ratingPlan.defaultDeductibleCents) {
        setRetentionAmt(String(prod.ratingPlan.defaultDeductibleCents / 100));
      }
      if (prodCode === 'MED_MAL') {
        setSpecialtyClass('MED_SURGERY');
        setExposureVal('10'); // 10 doctors
      } else if (prodCode === 'DNO') {
        setSpecialtyClass('FIN_MGMT');
        setExposureVal('50000000'); // $50M assets
      } else {
        setSpecialtyClass('TECH_SAAS_EO');
        setExposureVal('5000000'); // $5M revenue
      }
    }
    setRatingResult(null);
  };

  // Execute rating via Helios2 -> helios-rules
  const handleExecuteRating = async () => {
    setIsRating(true);
    setRatingError(null);
    try {
      const payload = {
        submsnId: submsnId ? Number(submsnId) : null,
        productCode: selectedProductCode,
        planCode: associatedPlan?.planCode,
        ruleVersionId: associatedPlan?.ruleVersionId || 'v1.0.0',
        stateCode: stateCode,
        exposureVal: String(exposureVal),
        limitAmt: String(limitAmt),
        retentionAmt: String(retentionAmt),
        dynamicAttributes: {
          RetroactiveCoverageYears: Number(retroYears),
          ClaimFreeYears: Number(claimFreeYears),
          PriorMalpracticeClaimsCount: Number(claimsCount),
          DefenseOutsideLimits: Boolean(defenseOutsideLimits),
          PracticeSpecialtyClass: specialtyClass,
          HasPeerReviewProgram: true
        }
      };

      const res = await apiFetch('/api/rating/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setRatingResult(res);
    } catch (err) {
      setRatingError(err.message || 'Failed connecting to standalone helios-rules rating engine');
    } finally {
      setIsRating(false);
    }
  };

  // Save the calculated quote to database
  const handleSaveQuote = async () => {
    if (!ratingResult) return;
    setIsSaving(true);
    try {
      const payload = {
        submsnId: submsnId ? Number(submsnId) : 100010,
        productCode: selectedProductCode,
        planCode: associatedPlan?.planCode || ratingResult.planCode,
        planName: associatedPlan?.planName || ratingResult.planName,
        ruleVersionId: associatedPlan?.ruleVersionId || ratingResult.ruleVersionId,
        stateCode: stateCode,
        exposureVal: String(exposureVal),
        limitAmt: String(limitAmt),
        retentionAmt: String(retentionAmt),
        premium: ratingResult.calculatedAmount,
        calcTrace: (ratingResult.executionTrace || []).join('\n'),
        factsJson: JSON.stringify(ratingResult.factsOutput || {}),
        status: 'Quoted',
        autoRate: false
      };

      await apiFetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (onSaved) onSaved();
    } catch (err) {
      setRatingError('Failed saving quote: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#013a12', color: '#ffffff', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalculateIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              Helios2 Underwriting Rating Center
            </Typography>
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
              Standalone helios-rules Drools Microservice Integration
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loadingProducts ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>
              Loading products and rating plans...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* Step 1: Product Selection & Associated Rating Plan */}
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#cbd5e1' }}>
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  1. Select Product & View Associated Rating Plan
                </Typography>
              </Box>
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="product-select-label">Product</InputLabel>
                      <Select
                        labelId="product-select-label"
                        value={selectedProductCode}
                        label="Product"
                        onChange={(e) => handleProductChange(e.target.value)}
                      >
                        {products.map((p) => (
                          <MenuItem key={p.productCode} value={p.productCode}>
                            {p.productName} ({p.productCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      label="Linked Submission # (optional)"
                      placeholder="e.g. 100010"
                      value={submsnId}
                      onChange={(e) => setSubmsnId(e.target.value)}
                    />
                  </Grid>
                </Grid>

                {/* Associated Rating Plan Details Banner */}
                {associatedPlan && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: '#f0fdf4',
                      borderColor: '#bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534' }}>
                          Associated Rating Plan: {associatedPlan.planName}
                        </Typography>
                        <Chip label={associatedPlan.ruleVersionId || 'v1.0.0'} size="small" color="success" />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>
                        Exposure: <strong>{associatedPlan.exposureBasis}</strong> • Default Base: <strong>${((associatedPlan.defaultBasePremiumCents || 250000) / 100).toLocaleString()}</strong> • {associatedPlan.description}
                      </Typography>
                    </Box>
                    <Chip label="Drools KieSession" size="small" variant="outlined" color="success" />
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Rating Facts Configuration */}
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#cbd5e1' }}>
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  2. Configure Quote Facts for helios-rules
                </Typography>
              </Box>
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="state-select-label">Jurisdiction State</InputLabel>
                      <Select
                        labelId="state-select-label"
                        value={stateCode}
                        label="Jurisdiction State"
                        onChange={(e) => setStateCode(e.target.value)}
                      >
                        <MenuItem value="CA">California (CA)</MenuItem>
                        <MenuItem value="NY">New York (NY)</MenuItem>
                        <MenuItem value="TX">Texas (TX)</MenuItem>
                        <MenuItem value="FL">Florida (FL)</MenuItem>
                        <MenuItem value="IL">Illinois (IL)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      label={`Exposure (${associatedPlan?.exposureBasis || 'Revenue'})`}
                      value={exposureVal}
                      onChange={(e) => setExposureVal(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      label="Coverage Limit ($)"
                      value={limitAmt}
                      onChange={(e) => setLimitAmt(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      label="Deductible / SIR ($)"
                      value={retentionAmt}
                      onChange={(e) => setRetentionAmt(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Prior Acts Retro Years"
                      value={retroYears}
                      onChange={(e) => setRetroYears(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Claims-Free Tenure (Years)"
                      value={claimFreeYears}
                      onChange={(e) => setClaimFreeYears(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <MuiTextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Prior 5-Yr Malpractice Claims"
                      value={claimsCount}
                      onChange={(e) => setClaimsCount(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="specialty-select-label">Practice Specialty</InputLabel>
                      <Select
                        labelId="specialty-select-label"
                        value={specialtyClass}
                        label="Practice Specialty"
                        onChange={(e) => setSpecialtyClass(e.target.value)}
                      >
                        <MenuItem value="TECH_SAAS_EO">Tech & SaaS Software (E&O)</MenuItem>
                        <MenuItem value="MED_SURGERY">High-Acuity Surgery / Ortho</MenuItem>
                        <MenuItem value="CYBER_FINTECH_EO">FinTech & Payment Processing</MenuItem>
                        <MenuItem value="MERGERS_ACQUISITIONS_LAW">M&A & Securities Legal</MenuItem>
                        <MenuItem value="TAX_BOOKKEEPING_CPA">Tax & Bookkeeping CPA</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={defenseOutsideLimits}
                          onChange={(e) => setDefenseOutsideLimits(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Defense Outside Limits (CEOL)"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2.5, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    disabled={isRating}
                    startIcon={isRating ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                    onClick={handleExecuteRating}
                    sx={{ fontWeight: 700, textTransform: 'none', px: 3 }}
                  >
                    {isRating ? 'Outputting Facts to Helios-Rules...' : 'Output Facts & Calculate Rate (Helios-Rules)'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Error Banner */}
            {ratingError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {ratingError}
              </Alert>
            )}

            {/* Step 3: Helios-Rules Calculation Result & Facts Output Display */}
            {ratingResult && (
              <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#047857', borderWidth: 2 }}>
                <Box sx={{ p: 2, backgroundColor: '#ecfdf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>
                      Calculated Amount Returned by helios-rules
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#047857' }}>
                      {ratingResult.calculatedAmount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#065f46' }}>
                      Base Premium: <strong>{ratingResult.baseAmount}</strong> • Engine: <strong>{ratingResult.engineSource}</strong> in {ratingResult.executionTimeMs}ms
                    </Typography>
                  </Box>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={ratingResult.ratingStatus || 'RATED'}
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                    Drools Fired Rules & Execution Trace:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                    {(ratingResult.executionTrace || []).map((step, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 0.85,
                          backgroundColor: '#f8fafc',
                          borderRadius: 1,
                          borderLeft: '3px solid #047857',
                          fontFamily: 'monospace',
                          fontSize: '0.78rem'
                        }}
                      >
                        {step}
                      </Box>
                    ))}
                  </Box>

                  {/* Facts JSON Card */}
                  <Accordion variant="outlined" sx={{ borderRadius: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon fontSize="small" color="primary" />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          View Raw Facts Output Sent by Helios2 to helios-rules
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          backgroundColor: '#0f172a',
                          color: '#38bdf8',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxHeight: 200,
                          overflowY: 'auto'
                        }}
                      >
                        <pre style={{ margin: 0 }}>{JSON.stringify(ratingResult.factsOutput, null, 2)}</pre>
                      </Paper>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!ratingResult || isSaving}
          onClick={handleSaveQuote}
          sx={{ fontWeight: 700 }}
        >
          {isSaving ? 'Saving Quote...' : ratingResult ? `Save & Create Quote (${ratingResult.calculatedAmount})` : 'Save Quote'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * NestedQuotesView: Component handling Tier 3 nested route paths:
 * - /submissions/:id/quotes or /submissions/quotes
 * - /policies/:id/quotes or /policies/quotes
 */
export function NestedQuotesView({ context = 'submissions' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isSubmission = context === 'submissions';
  const parentTitle = isSubmission ? 'Submissions' : 'Policies';
  const parentBaseUrl = isSubmission ? '/submissions' : '/policies';
  const [openRateModal, setOpenRateModal] = useState(false);
  const refresh = useRefresh();

  return (
    <Box sx={{ p: 1 }}>
      <Breadcrumbs sx={{ mb: 2, fontSize: '0.85rem' }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(parentBaseUrl)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', textDecoration: 'none' }}
        >
          <ArrowBackIcon fontSize="small" />
          {parentTitle} {id ? `#${id}` : ''}
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          Quotes & Rating
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <CalculateIcon sx={{ fontSize: 32, color: '#0284c7' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {parentTitle} Quotes & Rating Worksheet
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {id
              ? `Dynamic rating calculations and generated rate proposals for ${isSubmission ? 'Submission' : 'Policy'} #${id}`
              : `Dynamic rating calculations and quote records across all active ${parentTitle.toLowerCase()}`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CalculateIcon />}
          onClick={() => setOpenRateModal(true)}
          sx={{ ml: 'auto', fontWeight: 700, textTransform: 'none' }}
        >
          Rate Quote for {isSubmission ? 'Submission' : 'Policy'} #{id || ''}
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <QuoteList />
        </CardContent>
      </Card>

      <HeliosRulesRateModal
        open={openRateModal}
        initialSubmsnId={id}
        onClose={() => setOpenRateModal(false)}
        onSaved={() => {
          setOpenRateModal(false);
          refresh();
        }}
      />
    </Box>
  );
}
