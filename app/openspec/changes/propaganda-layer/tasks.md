## 1. Voice Profile Authoring

- [ ] 1.1 Define voice profile schema (tone, key phrases, references, example language, genuine argument, dependents)
- [ ] 1.2 Author DTE Energy voice profile (from PSC filings, earnings calls, union partnership language)
- [ ] 1.3 Author DWSD voice profile (water utility institutional language)
- [ ] 1.4 Author 3M Corporation voice profile (from SEC filings, legal defense language)
- [ ] 1.5 Author real estate developer voice profile (from Detroit development press, Bedrock/Gilbert language)
- [ ] 1.6 Author Michigan Farm Bureau voice profile (from policy position papers)
- [ ] 1.7 Author state legislature voice profile (from committee hearing transcripts)

## 2. Frame Generation Batch Job

- [ ] 2.1 Create frame generation prompt template with antagonist voice profile injection
- [ ] 2.2 Implement batch frame generator (processes severity 2+ headlines, generates 3 frames each)
- [ ] 2.3 Integrate memeorandum cluster data into generation prompt (when available)
- [ ] 2.4 Implement confidence scoring on generated frames (discard low-confidence)
- [ ] 2.5 Wire frame generation into hourly pipeline (after classification, before storage)
- [ ] 2.6 Implement retry logic for frameless headlines (retry next cycle)
- [ ] 2.7 Add frame generation to headline storage format (extend ProcessedHeadline type)

## 3. Frame Selection Logic

- [ ] 3.1 Implement `selectFrame(headline, gameState)` function (client-side, no LLM)
- [ ] 3.2 Implement active antagonist detection (which arcs are active → which antagonists apply)
- [ ] 3.3 Implement counter-condition check (has player countered this antagonist → shift frame)
- [ ] 3.4 Implement player-choice-reactive selection (accepted vs rejected establishment offer)
- [ ] 3.5 Implement fallback chain (establishment → market → community → raw headline)

## 4. API & Integration

- [ ] 4.1 Extend headline API response to include frames array per headline
- [ ] 4.2 Add frame selection hints to API (include active antagonist IDs so client can select)
- [ ] 4.3 Integrate with counter-narrative system (counter-narratives reference specific frames when firing)
- [ ] 4.4 Add attribution formatting (faction perspective labels, not fake quotes)

## 5. Testing & Quality

- [ ] 5.1 Test frame generation quality with 20 real headlines (manual review of output)
- [ ] 5.2 Test frame selection logic with varied game states (antagonist active, countered, neutral)
- [ ] 5.3 Verify frames sound like real institutional language (compare to actual DTE/DWSD press releases)
- [ ] 5.4 Test fallback paths (no frames available, partial frames, LLM failure)
- [ ] 5.5 Cost monitoring: verify actual LLM spend vs projected $1-3/day
