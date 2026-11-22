# Legacy Arabic translation service

The current player translates in the browser. This directory documents the previous standalone backend and is only relevant to deployments that still use it. See the [player README](../README.md#arabic-translation).

GitHub Pages serves the player. Cloud Run receives on-demand translation requests and calls Google Cloud Translation Advanced using an attached service account. The repository contains a starter English–Arabic PMP glossary for consistent terminology.

## Deploy in your Google Cloud project

Use Google Cloud Shell or an authenticated local Google Cloud CLI. Enable billing on the project. In the Cloud Translation API quota editor, set a daily general-model character quota before enabling public access. For example, 15,000 characters per day stays within 465,000 characters in a 31-day month for this project. A public browser endpoint can be called by other clients, since a caller can forge an Origin header. The service also enforces a per-instance character rate limit. For a shared deployment that needs individually controlled access, put the endpoint behind sign-in and per-user rate limits before raising quota.

From the repository root, set the project identifier and run the following commands. Substitute your own project ID.

```sh
VCE_PROJECT=your-google-cloud-project-id
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com translate.googleapis.com storage.googleapis.com --project="$VCE_PROJECT"
gcloud iam service-accounts create vce-translation --project="$VCE_PROJECT"
VCE_RUNTIME="vce-translation@$VCE_PROJECT.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$VCE_PROJECT" --member="serviceAccount:$VCE_RUNTIME" --role=roles/cloudtranslate.user
```

Create a Cloud Storage bucket and upload [the glossary](pmp-en-ar.tsv). Follow Google's [glossary setup](https://docs.cloud.google.com/translate/docs/advanced/glossary) to grant the Cloud Translation service agent read access to that object and create the unidirectional `pmp-en-ar` glossary in `us-central1`. Use `en` as the source and `ar` as the target. Wait for the glossary creation operation to succeed. The Cloud Run runtime account does not need storage access.

```sh
gcloud run deploy vce-translation --project="$VCE_PROJECT" --region=us-central1 \
  --source=translation-server --service-account="$VCE_RUNTIME" \
  --max-instances=1 --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$VCE_PROJECT,GLOSSARY_ID=pmp-en-ar,APP_ORIGIN=https://fatema-3li.github.io"
```

The deployer needs permission to build from source and use the runtime service account. See [Cloud Run source deployment](https://docs.cloud.google.com/run/docs/deploying-source-code) for the IAM roles. If you need to verify the service before creating the glossary, omit `GLOSSARY_ID` and redeploy with it before validating terminology.

Verify the public endpoint with synthetic content:

```sh
VCE_TRANSLATION_URL=https://your-service.run.app/translate
curl --fail-with-body "$VCE_TRANSLATION_URL" \
  -H 'Origin: https://fatema-3li.github.io' -H 'Content-Type: application/json' \
  --data '{"texts":["The project sponsor must not exceed 10%.","Option B is correct. CPI = EV / AC."]}'
```

The legacy frontend used this URL as its translation endpoint. The current frontend uses local inference. The deployment uses short-lived service identity tokens.

## Data and cost

Arabic mode sends the displayed question, answer choices and matching text, explanations when revealed, and case study titles and text when opened. Those fields can themselves contain sensitive material. Candidate names entered into the app, answer selections, answer key indexes, grades, timers, saved sessions, and diagram image bytes stay in the browser. The service does not log request bodies or persist translations. Recently translated text is cached in that browser, keyed by source text and endpoint. Diagram labels embedded in pixels require separate OCR or image translation.

Standard NMT currently includes a monthly credit for the first 500,000 characters and costs USD $20 per million characters above that at ordinary usage levels. Cloud Run, Cloud Build, Artifact Registry, and Cloud Storage may have separate usage charges. See [Cloud Translation pricing](https://cloud.google.com/products/translate/pricing) and [quota controls](https://docs.cloud.google.com/translate/quotas).
