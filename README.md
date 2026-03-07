# Workout Bot

Training plan and workout summary for the Trail 50K (May 23, 2026).

## Deploy to Vercel

### Option A: Deploy with Vercel CLI (no Git required)

1. Install Vercel CLI (one time):  
   `npm i -g vercel`

2. From this folder, run:  
   `vercel`

3. Log in or create a Vercel account when prompted.

4. Accept the defaults (or set a project name). Vercel will give you a URL like `workout-bot-xxx.vercel.app`. The **root URL** serves the training plan.

5. To deploy again after changes:  
   `vercel --prod`

### Option B: Connect a Git repo (GitHub / GitLab / Bitbucket)

1. Push this project to a GitHub (or GitLab/Bitbucket) repo.

2. Go to [vercel.com/new](https://vercel.com/new).

3. Click **Import** and select your repo. Connect your account if needed.

4. **Root Directory:** leave as `.` (or select the folder that contains `vercel.json` and `training-plan.html`).

5. **Build:** leave empty (static site). **Output Directory:** leave default.

6. Click **Deploy**. Every push to the main branch will trigger a new deployment.

Your plan will be live at `your-project.vercel.app`. The homepage (`/`) shows the training plan.
