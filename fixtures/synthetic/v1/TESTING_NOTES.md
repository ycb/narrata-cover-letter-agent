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
- **Resume Upload:** ✅ P01_resume.txt (806 bytes) - 6604.70ms total
  - Text extraction: 9.90ms
  - LLM analysis: 3970.30ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 91.20ms
- **Cover Letter Upload:** ✅ P01_cover_letter.txt (720 bytes) - 5759.40ms total
  - Text extraction: 2.60ms
  - LLM analysis: 2213.20ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 133.30ms
- **LinkedIn Data:** ✅ Connected (mock data) - 766.70ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** First complete test with fixed LLM processing system. Total processing time: ~13.1 seconds

### P02 - Jordan Alvarez (Mid, ClimateTech, 7 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P02_resume.txt (511 bytes) - 9267.20ms total (Text extraction: 2.10ms, LLM analysis: 6969.40ms, Database save: 89.10ms)
- **Cover Letter Upload:** ✅ P02_cover_letter.txt (542 bytes) - 5339.80ms total (Text extraction: 3.60ms, LLM analysis: 2149.90ms, Database save: 157.90ms)
- **LinkedIn Data:** ✅ Connected (mock data) - 681.30ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** Second complete test with fixed LLM processing system. Total processing time: ~15.3 seconds

### P03 - Riley Gupta (Mid, Fintech, 6 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P03_resume.txt (507 bytes) - 5908.30ms total (Text extraction: 213.30ms, LLM analysis: 3342.80ms, Database save: 84.90ms)
- **Cover Letter Upload:** ✅ P03_cover_letter.txt (555 bytes) - 6493.00ms total (Text extraction: 2.20ms, LLM analysis: 4517.30ms, Database save: 87.00ms)
- **LinkedIn Data:** ✅ Connected (mock data) - 738.00ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** Third complete test with fixed LLM processing system. Total processing time: ~13.1 seconds

### P04 - Morgan Patel (Mid, AI/ML, 9 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P04_resume.txt (500 bytes) - 6677.70ms total (Text extraction: 44.90ms, LLM analysis: 4392.40ms, Database save: 114.40ms)
- **Cover Letter Upload:** ✅ P04_cover_letter.txt (434 bytes) - 5676.20ms total (Text extraction: 4.40ms, LLM analysis: 2205.00ms, Database save: 108.30ms)
- **LinkedIn Data:** ✅ Connected (mock data) - 913.00ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** Fourth complete test with fixed LLM processing system. Total processing time: ~13.3 seconds 

### P05 - Samira Khan (Mid, HealthTech, 7 years)
- **Status:** ✅ Completed
- **Resume Upload:** ✅ P05_resume.txt (415 bytes) - 9178.50ms total
  - Text extraction: 14.70ms
  - LLM analysis: 4027.40ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 136.50ms
- **Cover Letter Upload:** ✅ P05_cover_letter.txt (420 bytes) - 7015.10ms total
  - Text extraction: 3.80ms
  - LLM analysis: 4229.60ms (GPT-3.5-turbo, 800 tokens)
  - Database save: 84.40ms
- **LinkedIn Data:** ✅ Connected (mock data) - 818.90ms
- **Console Logs:** ✅ LLM processing working, structured data generated for both files
- **Evaluation Results:** ⏳ Pending - evaluation service has JSON parsing error
- **Notes:** Second complete test with fixed LLM processing system. Total processing time: ~17.0 seconds 

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
