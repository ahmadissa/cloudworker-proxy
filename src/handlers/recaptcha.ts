const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
async function createAssessment({
  projectID = 'your-project-id',
  recaptchaKey = 'your-recaptcha-key',
  token = 'action-token',
  recaptchaAction = 'action-name',
}) {
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);
  const request = {
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  };

  const [response] = await client.createAssessment(request);

  if (!response.tokenProperties.valid) {
    console.error(
      'The CreateAssessment call failed because the token was: ' +
        response.tokenProperties.invalidReason,
    );

    return null;
  }
  if (response.tokenProperties.action === recaptchaAction) {
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
export default function recaptcha(projectID, recaptchaKey) {
  function getToken(headers) {
    return { token: headers['G-Recaptcha-Token'], action: headers['G-Recaptcha-Action'] };
  }

  return async (ctx, next) => {
    const { token, action } = getToken(ctx.request.headers);

    const score =
      (await createAssessment({
        projectID: projectID,
        recaptchaKey: recaptchaKey,
        token: token,
        recaptchaAction: action,
      })) || 0;
    if (score < 0.5) {
      ctx.status = 409;
      return;
    }
    await next(ctx);
  };
}
