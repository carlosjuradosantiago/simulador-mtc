const REMOTE_ENVIRONMENTS = {
  development: {
    apiBaseUrl: 'https://flrvcaizsjhieuvhqkxh.supabase.co/functions/v1/api',
    supabaseUrl: 'https://flrvcaizsjhieuvhqkxh.supabase.co',
    supabasePublishableKey: 'sb_publishable_SP83w7KsaRTm12u5ZcvKBQ_aUnupSkc',
    fullExamFree: false,
  },
  production: {
    apiBaseUrl: 'https://wazikdsfacrawhphzltn.supabase.co/functions/v1/api',
    supabaseUrl: 'https://wazikdsfacrawhphzltn.supabase.co',
    supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhemlrZHNmYWNyYXdocGh6bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTk2OTIsImV4cCI6MjA3NTQzNTY5Mn0.--xoCk-6Xq0qmUYDDuatBTLOl2q1Nxns_85A4xaiDOU',
    fullExamFree: true,
  },
};

export function resolveRemoteEnvironment(environment) {
  return REMOTE_ENVIRONMENTS[environment === 'production' ? 'production' : 'development'];
}
