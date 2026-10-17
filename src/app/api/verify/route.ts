import { NextResponse } from 'next/server';
import { runTataDanaVerificationSuite } from '@/test/verify-engine';
import { runTataAiVerification } from '@/test/tata-ai-verify';

export async function GET() {
  const result = runTataDanaVerificationSuite();
  const tataAiResult = runTataAiVerification();
  return NextResponse.json({
    status: result.summary.failed === 0 && tataAiResult.summary.failed === 0 ? 'ALL_TESTS_PASSED' : 'TESTS_FAILED',
    suite: 'TataDana Fintech End-to-End Test Suite',
    timestamp: new Date().toISOString(),
    ...result,
    tataAiSuite: tataAiResult,
  });
}
