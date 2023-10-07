async function createAssessment({
  projectID = 'your-project-id',
  API_KEY = 'GCP_API_KEY',
  token = 'action-token',
  siteKey = 'siteKey',
  expectedAction = 'action-name',
}) {
  const res = await fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${projectID}/assessments?key=${API_KEY}`,
    {
      body: JSON.stringify({
        event: {
          token: token,
          siteKey: siteKey,
          expectedAction: expectedAction,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const response = await res.json();
  if (!response.tokenProperties.valid) {
    console.error(
      'The CreateAssessment call failed because the token was: ' +
        response.tokenProperties.invalidReason,
    );

    return 0;
  }
  if (response.tokenProperties.action === expectedAction) {
    response.riskAnalysis.reasons.forEach((reason) => {
      console.log(reason);
    });
    return response.riskAnalysis.score;
  } else {
    console.error(
      'The action attribute in your reCAPTCHA tag ' +
        'does not match the action you are expecting to score',
    );
    return null;
  }
}
export default function recaptcha({ projectID, API_KEY, siteKey }) {
  function getToken(headers) {
    return { token: headers['g-recaptcha-token'], expectedAction: headers['g-recaptcha-action'] };
  }

  return async (ctx, next) => {
    const { token, expectedAction } = getToken(ctx.request.headers);

    const score =
      (await createAssessment({
        projectID: projectID,
        API_KEY: API_KEY,
        token: token,
        siteKey: siteKey,
        expectedAction: expectedAction,
      })) || 0;
    if (score < 0.5) {
      ctx.status = 409;
      return;
    }
    await next(ctx);
  };
}
