'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RACE_DISTANCE_OPTIONS,
  MIN_PLAN_WEEKS,
  MAX_PLAN_WEEKS,
  clampPlanWeeks,
  weeksFromNowToRaceWeek,
} from '@/lib/race-distances';

function defaultWeeksForDistance(d: string): number {
  return RACE_DISTANCE_OPTIONS.find((o) => o.value === d)?.weeks ?? 12;
}

function FormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [raceUrl, setRaceUrl] = useState('');
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [distance, setDistance] = useState('Marathon');
  const [planWeeks, setPlanWeeks] = useState(() => defaultWeeksForDistance('Marathon'));
  const [goal, setGoal] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState('');
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [crossTraining, setCrossTraining] = useState<'yes' | 'no' | ''>('');
  const [crossTrainingType, setCrossTrainingType] = useState('');
  const [currentWeeklyMiles, setCurrentWeeklyMiles] = useState('');
  const [longRunDay, setLongRunDay] = useState('');
  const [injuriesOrLimitations, setInjuriesOrLimitations] = useState('');
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState('');
  const [trailVsRoad, setTrailVsRoad] = useState('');
  const [runThisDistanceBefore, setRunThisDistanceBefore] = useState<'yes' | 'no' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (day: string) => {
    setPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'strava_denied') setError('Strava authorization was cancelled.');
    if (err === 'strava_failed') setError('Strava connection failed. Try again.');
  }, [searchParams]);

  useEffect(() => {
    const trimmed = raceDate.trim();
    if (!trimmed) return;
    const w = weeksFromNowToRaceWeek(trimmed);
    if (w != null) setPlanWeeks(w);
  }, [raceDate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          age: age.trim() ? parseInt(age, 10) : undefined,
          gender: gender.trim() || undefined,
          raceUrl: raceUrl.trim(),
          raceName: raceName.trim() || 'Marathon',
          raceDate: raceDate.trim(),
          distance: distance || 'Marathon',
          weeks: clampPlanWeeks(planWeeks),
          goal: goal.trim() || undefined,
          targetTime: targetTime.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
          trainingDaysPerWeek: trainingDaysPerWeek.trim() ? parseInt(trainingDaysPerWeek, 10) : undefined,
          preferredDays: preferredDays.length ? preferredDays : undefined,
          crossTraining: crossTraining === 'yes' ? true : crossTraining === 'no' ? false : undefined,
          crossTrainingType: crossTraining === 'yes' ? crossTrainingType.trim() || undefined : undefined,
          currentWeeklyMiles: currentWeeklyMiles.trim() || undefined,
          longRunDay: longRunDay.trim() || undefined,
          injuriesOrLimitations: injuriesOrLimitations.trim() || undefined,
          preferredTimeOfDay: preferredTimeOfDay.trim() || undefined,
          trailVsRoad: trailVsRoad.trim() || undefined,
          runThisDistanceBefore: runThisDistanceBefore === 'yes' ? true : runThisDistanceBefore === 'no' ? false : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to create plan');
        setLoading(false);
        return;
      }
      const planId = data.planId;
      // Optional: redirect to Strava to connect, then callback will go to plan page
      const connectStrava = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name=connectStrava]')?.checked;
      if (connectStrava) {
        window.location.href = `/api/auth/strava?state=${planId}`;
        return;
      }
      router.push(`/app/plan/${planId}`);
      router.refresh();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  const raceDateTrimmed = raceDate.trim();
  const suggestedWeeksFromRace = raceDateTrimmed ? weeksFromNowToRaceWeek(raceDateTrimmed) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>
          Your race plan
        </h1>
        <p style={{ color: '#737373', fontSize: '0.9rem', marginBottom: 24 }}>
          We’ll build a plan from your race date—by default from this week through race week—and tailor it to your distance.
        </p>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            First name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Last name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Age (optional)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 35"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Gender (optional)
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            <option value="">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race name
          </label>
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            placeholder="e.g. Boston Marathon"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race date <span style={{ color: '#e85d04' }}>*</span>
          </label>
          <input
            type="date"
            value={raceDate}
            onChange={(e) => setRaceDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            How many weeks should the plan cover? <span style={{ color: '#e85d04' }}>*</span>
          </label>
          <input
            type="number"
            min={MIN_PLAN_WEEKS}
            max={MAX_PLAN_WEEKS}
            value={planWeeks}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setPlanWeeks(Number.isFinite(v) ? v : planWeeks);
            }}
            onBlur={() => setPlanWeeks((w) => clampPlanWeeks(w))}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 8,
            }}
          />
          <p style={{ color: '#737373', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.45 }}>
            {suggestedWeeksFromRace != null ? (
              <>
                Defaults to {suggestedWeeksFromRace} weeks—from this calendar week through your race week (Monday-aligned). Adjust if you want fewer weeks or more buildup before race week (max {MAX_PLAN_WEEKS}).
              </>
            ) : raceDateTrimmed ? (
              <>
                This race date isn’t ahead of the current week in our calendar math, or it’s invalid—set weeks manually ({MIN_PLAN_WEEKS}–{MAX_PLAN_WEEKS}). Many athletes use about {defaultWeeksForDistance(distance)} weeks for this distance.
              </>
            ) : (
              <>
                After you choose a race date, we’ll suggest the week count from now through race week. You can always edit it ({MIN_PLAN_WEEKS}–{MAX_PLAN_WEEKS} weeks).
              </>
            )}
          </p>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Race distance
          </label>
          <select
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            {RACE_DISTANCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Link to race (optional)
          </label>
          <input
            type="url"
            value={raceUrl}
            onChange={(e) => setRaceUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Why are you running?
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            <option value="">Select a goal (optional)</option>
            <option value="Finish strong / have fun">Finish strong / have fun</option>
            <option value="First marathon">First marathon</option>
            <option value="PR / time goal">PR / time goal</option>
            <option value="Qualify for longer race">Qualify for longer race</option>
            <option value="Stay consistent">Stay consistent</option>
            <option value="Other">Other</option>
          </select>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Target time (optional)
          </label>
          <input
            type="text"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            placeholder="e.g. under 7 hours, 6:30"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: '1px solid #262626',
                borderRadius: 8,
                color: '#a3a3a3',
                fontSize: '0.9rem',
                padding: '10px 14px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span style={{ transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
              Advanced (optional)
            </button>
            {advancedOpen && (
              <div style={{ marginTop: 16, padding: '16px 0 0', borderTop: '1px solid #262626' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  How many days per week do you plan to run?
                </label>
                <select
                  value={trainingDaysPerWeek}
                  onChange={(e) => setTrainingDaysPerWeek(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Select</option>
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n} days</option>
                  ))}
                </select>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 8, color: '#a3a3a3' }}>
                  Best days for running (select all that apply)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {DAYS.map((day) => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={preferredDays.includes(day)}
                        onChange={() => toggleDay(day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Preferred day for your long run?
                </label>
                <select
                  value={longRunDay}
                  onChange={(e) => setLongRunDay(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Any</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Current or typical weekly mileage?
                </label>
                <input
                  type="text"
                  value={currentWeeklyMiles}
                  onChange={(e) => setCurrentWeeklyMiles(e.target.value)}
                  placeholder="e.g. 15–20 mi"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                />
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Preferred time of day to run?
                </label>
                <select
                  value={preferredTimeOfDay}
                  onChange={(e) => setPreferredTimeOfDay(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Select</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Flexible">Flexible</option>
                </select>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Trail vs road preference?
                </label>
                <select
                  value={trailVsRoad}
                  onChange={(e) => setTrailVsRoad(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Select</option>
                  <option value="Trail">Trail</option>
                  <option value="Road">Road</option>
                  <option value="Both">Both</option>
                  <option value="No preference">No preference</option>
                </select>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Have you run this distance before?
                </label>
                <select
                  value={runThisDistanceBefore}
                  onChange={(e) => setRunThisDistanceBefore(e.target.value as 'yes' | 'no' | '')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
                  Do you plan to include cross training?
                </label>
                <select
                  value={crossTraining}
                  onChange={(e) => setCrossTraining(e.target.value as 'yes' | 'no' | '')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 8,
                    color: '#f5f5f5',
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {crossTraining === 'yes' && (
                  <input
                    type="text"
                    value={crossTrainingType}
                    onChange={(e) => setCrossTrainingType(e.target.value)}
                    placeholder="What type? e.g. cycling, swimming, strength"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#141414',
                      border: '1px solid #262626',
                      borderRadius: 8,
                      color: '#f5f5f5',
                      fontSize: 16,
                      marginBottom: 16,
                      marginTop: 8,
                    }}
                  />
                )}
              </div>
            )}
          </div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Any injuries or limitations we should know about?
          </label>
          <input
            type="text"
            value={injuriesOrLimitations}
            onChange={(e) => setInjuriesOrLimitations(e.target.value)}
            placeholder="e.g. knee sensitivity, asthma, none"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 16,
            }}
          />
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: '#a3a3a3' }}>
            Anything else we should know?
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Weekly schedule, other context, etc."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: 8,
              color: '#f5f5f5',
              fontSize: 16,
              marginBottom: 20,
              resize: 'vertical',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <input type="checkbox" name="connectStrava" />
            <span style={{ fontSize: '0.9rem' }}>Connect Strava (personalize from your activity)</span>
          </label>
          {error && (
            <p style={{ color: '#e85d04', fontSize: '0.85rem', marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: '#e85d04',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating…' : 'Generate my plan'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#737373' }}>
          <a href="/" style={{ color: '#737373' }}>Back</a>
          {' · '}
          <a href="/training-plan.html" style={{ color: '#e85d04' }}>Example plan</a>
        </p>
      </div>
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#737373', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <FormContent />
    </Suspense>
  );
}
