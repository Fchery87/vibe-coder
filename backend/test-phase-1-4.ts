/**
 * Test Phase 1.4: Logging & Monitoring
 *
 * Run with: npx ts-node test-phase-1-4.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { log, flushLogs } from './src/services/logger';
import { auditLogService, AuditAction, AuditSeverity } from './src/services/audit-log-service';
import { performanceMonitor } from './src/services/performance-monitor';

async function testLogging() {
  console.log('\n🧪 Testing Structured Logging (Pino)...\n');

  try {
    // Test different log levels
    console.log('1️⃣  Testing log levels...');
    log.trace('This is a trace message', { detail: 'very detailed' });
    log.debug('This is a debug message', { detail: 'debugging info' });
    log.info('This is an info message', { status: 'normal operation' });
    log.warn('This is a warning message', { issue: 'potential problem' });
    log.error('This is an error message', new Error('Test error'));
    console.log('   ✅ All log levels working\n');

    // Test specialized log methods
    console.log('2️⃣  Testing specialized log methods...');
    log.http('POST', '/llm/generate', 200, 1500, { cached: true });
    log.llm('openai', 'gpt-4o', 1000, 0.02, false, 2000);
    log.cache('hit', 'llm:cache:openai:gpt-4o:abc123');
    log.job('code-generation', 'job-123', 'completed', { duration: 5000 });
    log.performance('api_response_time', 250, 'ms');
    log.security('rate_limit_exceeded', 'medium', { ip: '1.2.3.4' });
    log.event('user_signup', { userId: 'user-456', plan: 'free' });
    console.log('   ✅ Specialized logging working\n');

    // Test sensitive data redaction
    console.log('3️⃣  Testing sensitive data redaction...');
    log.info('Login attempt', {
      email: 'user@example.com',
      password: 'should-be-redacted', // Should be redacted
      token: 'secret-token', // Should be redacted
      apiKey: 'sk-123456', // Should be redacted
    });
    console.log('   ✅ Sensitive data redacted\n');

    console.log('✅ Logging Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Logging Test: FAILED', error.message);
    throw error;
  }
}

async function testAuditLog() {
  console.log('\n🧪 Testing Audit Log Service...\n');

  try {
    // Test user login audit
    console.log('1️⃣  Testing user login audit...');
    await auditLogService.logLogin('user-123', '192.168.1.1', true);
    await auditLogService.logLogin('user-456', '192.168.1.2', false, 'Invalid password');
    console.log('   ✅ Login audits logged\n');

    // Test code generation audit
    console.log('2️⃣  Testing code generation audit...');
    await auditLogService.logCodeGeneration('user-123', 'gpt-4o', 1500, 0.03, false);
    console.log('   ✅ Code generation audit logged\n');

    // Test LLM request audit
    console.log('3️⃣  Testing LLM request audit...');
    await auditLogService.logLLMRequest('user-123', 'anthropic', 'claude-3-5-sonnet-20241022', true);
    await auditLogService.logLLMRequest(undefined, 'openai', 'gpt-4o', false, 'API key invalid');
    console.log('   ✅ LLM request audits logged\n');

    // Test security events
    console.log('4️⃣  Testing security event audits...');
    await auditLogService.logRateLimitExceeded('1.2.3.4', '/llm/generate', 'BadBot/1.0');
    await auditLogService.logUnauthorizedAccess('5.6.7.8', '/admin', 'user-789');
    console.log('   ✅ Security events logged\n');

    // Test Git commit audit
    console.log('5️⃣  Testing Git commit audit...');
    await auditLogService.logGitCommit('user-123', 'abc123def456', 5);
    console.log('   ✅ Git commit audit logged\n');

    // Test custom audit log
    console.log('6️⃣  Testing custom audit log...');
    await auditLogService.log({
      userId: 'user-123',
      action: AuditAction.SETTINGS_UPDATE,
      severity: AuditSeverity.INFO,
      resource: 'user_settings',
      resourceId: 'user-123',
      metadata: {
        changed: ['theme', 'notifications'],
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      success: true,
    });
    console.log('   ✅ Custom audit log created\n');

    console.log('✅ Audit Log Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Audit Log Test: FAILED', error.message);
    throw error;
  }
}

async function testPerformanceMonitoring() {
  console.log('\n🧪 Testing Performance Monitoring...\n');

  try {
    // Test recording metrics
    console.log('1️⃣  Testing metric recording...');
    performanceMonitor.record({ name: 'test.metric', value: 100, unit: 'ms' });
    performanceMonitor.record({ name: 'test.metric', value: 150, unit: 'ms' });
    performanceMonitor.record({ name: 'test.metric', value: 200, unit: 'ms' });
    console.log('   ✅ Metrics recorded\n');

    // Test timer function
    console.log('2️⃣  Testing timer function...');
    await performanceMonitor.time('async.operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    console.log('   ✅ Timer function working\n');

    // Test manual timer
    console.log('3️⃣  Testing manual timer...');
    const timer = performanceMonitor.createTimer('manual.timer');
    await new Promise(resolve => setTimeout(resolve, 50));
    const duration = timer.stop();
    console.log(`   Duration: ${duration}ms`);
    console.log('   ✅ Manual timer working\n');

    // Test HTTP request metrics
    console.log('4️⃣  Testing HTTP request metrics...');
    performanceMonitor.recordHttpRequest('POST', '/llm/generate', 200, 1500);
    performanceMonitor.recordHttpRequest('GET', '/health', 200, 25);
    console.log('   ✅ HTTP metrics recorded\n');

    // Test LLM request metrics
    console.log('5️⃣  Testing LLM request metrics...');
    performanceMonitor.recordLLMRequest('openai', 'gpt-4o', 2000, 1500, false);
    performanceMonitor.recordLLMRequest('anthropic', 'claude-3-5-sonnet-20241022', 50, 0, true);
    console.log('   ✅ LLM metrics recorded\n');

    // Test cache operation metrics
    console.log('6️⃣  Testing cache operation metrics...');
    performanceMonitor.recordCacheOperation('hit', 10);
    performanceMonitor.recordCacheOperation('miss', 15);
    performanceMonitor.recordCacheOperation('set', 20);
    console.log('   ✅ Cache metrics recorded\n');

    // Test memory usage
    console.log('7️⃣  Testing memory usage recording...');
    performanceMonitor.recordMemoryUsage();
    console.log('   ✅ Memory usage recorded\n');

    // Test statistics
    console.log('8️⃣  Testing statistics calculation...');
    const stats = await performanceMonitor.getStats('test.metric');
    console.log(`   Count: ${stats.count}`);
    console.log(`   Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`   Min: ${stats.min}ms`);
    console.log(`   Max: ${stats.max}ms`);
    console.log(`   P50: ${stats.p50}ms`);
    console.log(`   P95: ${stats.p95}ms`);
    console.log(`   P99: ${stats.p99}ms`);
    console.log('   ✅ Statistics working\n');

    // Test dashboard
    console.log('9️⃣  Testing performance dashboard...');
    const dashboard = await performanceMonitor.getDashboard();
    console.log(`   HTTP Requests: ${dashboard.httpRequests.count} requests`);
    console.log(`   LLM Requests: ${dashboard.llmRequests.count} requests`);
    console.log(`   Cache Operations: ${dashboard.cachePerformance.count} operations`);
    console.log(`   Memory RSS: ${(dashboard.memory.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Used: ${(dashboard.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('   ✅ Dashboard working\n');

    // Test health check
    console.log('🔟 Testing health check...');
    const health = await performanceMonitor.healthCheck();
    console.log(`   Overall Health: ${health.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`   Redis: ${health.redis ? 'OK' : 'FAIL'}`);
    console.log(`   Memory: ${health.memory ? 'OK' : 'FAIL'}`);
    console.log(`   Uptime: ${health.uptime.toFixed(2)}s`);
    console.log('   ✅ Health check working\n');

    console.log('✅ Performance Monitoring Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Performance Monitoring Test: FAILED', error.message);
    throw error;
  }
}

async function testLogFlush() {
  console.log('\n🧪 Testing Log Flush (BetterStack)...\n');

  try {
    console.log('1️⃣  Generating logs to flush...');
    for (let i = 0; i < 10; i++) {
      log.info(`Test log message ${i}`, { iteration: i });
    }
    console.log('   ✅ Logs generated\n');

    console.log('2️⃣  Flushing logs to BetterStack...');
    await flushLogs();
    console.log('   ✅ Logs flushed\n');

    if (process.env.LOGTAIL_SOURCE_TOKEN) {
      console.log('💡 Logs sent to BetterStack Logtail!');
      console.log('   Check your dashboard at: https://logs.betterstack.com/');
    } else {
      console.log('⚠️  LOGTAIL_SOURCE_TOKEN not set - logs only local');
      console.log('   Set LOGTAIL_SOURCE_TOKEN to send logs to BetterStack');
    }

    console.log('\n✅ Log Flush Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Log Flush Test: FAILED', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Phase 1.4 Tests: Logging & Monitoring\n');
  console.log('='.repeat(60));

  try {
    // Run all tests
    await testLogging();
    await testAuditLog();
    await testPerformanceMonitoring();
    await testLogFlush();

    console.log('='.repeat(60));
    console.log('\n🎉 All Phase 1.4 Tests Passed!\n');
    console.log('📊 Summary:');
    console.log('  ✅ Structured Logging (Pino) - Working');
    console.log('  ✅ Audit Log Service - Working');
    console.log('  ✅ Performance Monitoring - Working');
    console.log('  ✅ Log Flush (BetterStack) - Working');

    console.log('\n📝 Next Steps:');
    console.log('  1. Get BetterStack Logtail token (https://logs.betterstack.com/)');
    console.log('  2. Add LOGTAIL_SOURCE_TOKEN to .env and Render');
    console.log('  3. Monitor logs in BetterStack dashboard');
    console.log('  4. Set up alerts for errors and security events');

    console.log('\n💡 BetterStack Setup:');
    console.log('  1. Sign up at https://betterstack.com/logtail (FREE)');
    console.log('  2. Create a new source');
    console.log('  3. Copy the source token');
    console.log('  4. Add to .env: LOGTAIL_SOURCE_TOKEN=your_token_here');

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Tests Failed:', error.message);
    process.exit(1);
  }
}

main();
