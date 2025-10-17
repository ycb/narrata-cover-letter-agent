# Synthetic Profile Testing Notes

**Test Date:** 2025-10-17  
**Test Account:** narrata.ai@gmail.com  
**Model:** gpt-3.5-turbo  
**Test Environment:** http://localhost:8080  

## Test Plan
Upload 10 synthetic profiles (P01-P10) through Narrata UI and collect evaluation logs to establish baseline metrics.

## Test Results

### P01 - Avery Chen (Mid, SaaS, 8 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P01_resume.txt (806 bytes) - 895.50ms
- **Cover Letter Upload:** ✅ P01_cover_letter.txt (720 bytes) - 433.50ms
- **LinkedIn Data:** ✅ Connected (mock data) - 809.00ms
- **Console Logs:** ✅ Batching system working, both files stored for combined analysis
- **Evaluation Results:** ⏳ Pending - batching system was broken, now disabled for individual processing
- **Notes:** File uploads working perfectly, .txt files now supported, batching system disabled

### P02 - Jordan Alvarez (Mid, ClimateTech, 7 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P02_resume.txt (511 bytes) - 434.10ms
- **Cover Letter Upload:** ✅ P02_cover_letter.txt (542 bytes) - 475.90ms
- **LinkedIn Data:** ✅ Connected (mock data) - 749.00ms
- **Console Logs:** ✅ Batching system working, both files stored for combined analysis
- **Evaluation Results:** ⏳ Pending - batching system was broken, now disabled for individual processing
- **Notes:** Consistent performance with P01, batching system disabled

### P03 - Riley Gupta (Mid, Fintech, 6 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P03_resume.txt (507 bytes) - 519.70ms
- **Cover Letter Upload:** ✅ P03_cover_letter.txt (555 bytes) - 910.70ms
- **LinkedIn Data:** ✅ Connected (mock data) - 617.60ms
- **Console Logs:** ✅ Batching system working, both files stored for combined analysis
- **Evaluation Results:** ⏳ Pending - batching system was broken, now disabled for individual processing
- **Notes:** Consistent performance pattern, batching system disabled

### P04 - Morgan Patel (Mid, AI/ML, 9 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P04_resume.txt (500 bytes) - 7383.80ms total
  - Text extraction: 15.80ms
  - LLM analysis: 4542.40ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 93.00ms
- **Cover Letter Upload:** ✅ P04_cover_letter.txt (434 bytes) - 6282.00ms total
  - Text extraction: 2.10ms
  - LLM analysis: 2511.50ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 107.80ms
- **LinkedIn Data:** ✅ Connected (mock data) - 826.10ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** First complete test with fixed LLM processing system. Total processing time: ~14.5 seconds 

### P05 - Samira Khan (Mid, HealthTech, 7 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

### P06 - Diego Morales (Mid, Platform, 8 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

### P07 - Noah Williams (Mid, Marketplace, 10 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

### P08 - Priya Desai (Early, EdTech, 2 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

### P09 - Leo Martin (Early, Consumer, 3 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

### P10 - Sophia Rivera (Director, SaaS, 12 years)
- **Status:** ⏳ Pending
- **Resume Upload:** 
- **Cover Letter Upload:** 
- **LinkedIn Data:** 
- **Console Logs:** 
- **Evaluation Results:** 
- **Notes:** 

## Issues Found
- 

## Patterns Identified
- 

## Baseline Metrics (To be calculated)
- **Latency p50:** 
- **Latency p90:** 
- **Latency p99:** 
- **Go Rate:** 
- **Accuracy Pass Rate:** 
- **Personalization Pass Rate:** 

## Next Steps
1. Complete all 10 profile uploads
2. Export evaluation data from localStorage
3. Calculate baseline metrics
4. Document findings
5. Commit results to git
