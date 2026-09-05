# 23 — Code Call Graph

Concrete route → middleware → controller → model/db call chains for the most important endpoints, citing real file paths and function names. See `05-request-response-flow.md` for full step-by-step prose walkthroughs of four of these; this file is the compact reference map for more endpoints.

## How to read these chains

Each chain lists, in order: the route definition (file + line-ish description), each middleware function invoked, the controller function that finally runs, and the `config/db.js` shim calls (and any other side effects) it makes.

## 1. POST /api/auth/login

```
routes/authRoutes.js
  router.post('/login', authLimiter, login)
    → express-rate-limit (authLimiter, 10/15min)
    → controllers/authController.js: login(req,res)
        → config/db.js: auth.getUserByEmail(email)
        → config/db.js: db.collection('users').doc(uid).get()
        → config/db.js: auth.verifyPassword(email,password)   [bcrypt.compare]
        → db.collection('failed_logins').add(...)              [on failure]
        → utils/sessions.js: createSession({...})               [db.collection('sessions').add(...)]
        → authController.issueSessionCookies()
            → utils/jwt.js: signAccessToken(payload)
            → utils/cookies.js: setAuthCookie(), setCsrfCookie()
        → utils/cookies.js: setRefreshCookie()
        → utils/respond.js: ok(res, {...})
```
No `authMiddleware` on this route — the user isn't authenticated yet. `csrfMiddleware` is skipped too (`/api/auth/login` is in `EXEMPT_PATHS`, `middleware/csrfMiddleware.js`).

## 2. POST /api/it/complaints (create IT ticket)

```
routes/itRoutes.js
  router.post('/complaints', auth, createComplaint)
    → middleware/authMiddleware.js: authMiddleware
        → utils/jwt.js: verifyAccessToken(token)
        → getProfile(uid) → config/db.js: db.collection('users').doc(uid).get()  [60s cache]
        → utils/sessions.js: isSessionRevoked(sid)  [30s cache]
    → controllers/itController.js (= complaintControllerFactory instance)
        → complaintControllerFactory.js: createComplaint(req,res)
            → config/db.js: db.collection('users').doc(req.user.id).get()
            → config/db.js: db.collection('it_complaints').add(docData)
            → utils/notificationRules.js: loadNotificationRules()
            → utils/mailer.js: sendMail(...)  [best-effort, try/catch]
            → utils/respond.js: created(res, {...})
```
`csrfMiddleware` runs (not exempt) — requires a valid `x-csrf-token` header/`_csrf` body field matching the `fute_csrf` cookie.

## 3. PATCH /api/it/complaints/:id/status

```
routes/itRoutes.js
  router.patch('/complaints/:id/status', auth, role('it','founder'), updateStatus)
    → authMiddleware  → (see above)
    → middleware/roleMiddleware.js: roleMiddleware('it','founder')
    → complaintControllerFactory.js: updateStatus(req,res)
        → config/db.js: db.runTransaction(async tx => {
              tx.get(docRef)                         [it_complaints/:id]
              tx.update(docRef, {status, updated_at})
              tx.set(approvalRef, {...})              [only on -> 'Waiting Approval']
          })
        → utils/notificationRules.js: loadNotificationRules()
        → config/db.js: db.collection('users').doc(user_id).get()
        → utils/mailer.js: sendMail(...)
        → utils/respond.js: ok(res, {...})
```

## 4. PATCH /api/approvals/:id/decide

```
routes/approvalRoutes.js
  router.patch('/:id/decide', auth, role('hr','founder'), decideApproval)
    → authMiddleware
    → roleMiddleware('hr','founder')
    → controllers/approvalController.js: decideApproval(req,res)
        → config/db.js: db.runTransaction(async tx => {
              tx.get(approvalDocRef)
              [role check for 'document'/'extra-hours' categories vs HR_DECIDABLE_CATEGORIES]
              tx.get(ticketRef)          [if approval.complaintRef set]
              tx.get(extraHoursRef)      [if approval.extraHoursId set]
              tx.update(approvalDocRef, {status, decidedAt, decidedBy})
              tx.update(ticketRef, {status: nextStatus, updated_at})
              tx.update(extraHoursRef, {status, decidedAt, decidedBy})
          })
        → notifyFounder(...) → db.collection('users').where('role','==','founder').get() → utils/mailer.js: sendMail(...)
        → utils/respond.js: ok(res, {...})
```

## 5. POST /api/hr-desk/employees/:id/documents/:docType

```
routes/hrDeskRoutes.js
  router.post('/employees/:id/documents/:docType', auth, role('hr','founder'), upload.single('file'), uploadEmployeeDocument)
    → authMiddleware
    → roleMiddleware('hr','founder')
    → utils/upload.js: multer memoryStorage + fileFilter (MIME allow-list)
    → controllers/hrDeskController.js: uploadEmployeeDocument(req,res)
        → config/db.js: db.collection('employees').doc(id).get()
        → fs.mkdirSync / fs.writeFileSync   [local disk, UPLOAD_ROOT-contained]
        → config/db.js: employeeRef.update({ [urlField]:..., [fileNameField]:..., 'storagePaths.<docType>':... })
        → config/db.js: db.collection('approvals').add({...})
        → notifyFounder(...) → utils/mailer.js: sendMail(...)
        → utils/respond.js: ok(res, {...})
```

## 6. GET /api/hr-desk/employees/:id/documents/:docType/download

```
routes/hrDeskRoutes.js
  router.get('.../download', auth, role('hr','founder'), downloadEmployeeDocument)
    → authMiddleware
    → roleMiddleware('hr','founder')
    → controllers/hrDeskController.js: downloadEmployeeDocument(req,res)
        → config/db.js: db.collection('employees').doc(id).get()
        → path containment check: absolutePath.startsWith(UPLOAD_ROOT)
        → fs.existsSync(absolutePath)
        → res.download(absolutePath, fileName)
```

## 7. POST /api/sales-desk/leads/import

```
routes/salesDeskRoutes.js
  router.post('/leads/import', auth, role('sales','founder'), uploadSpreadsheet.single('file'), importLeads)
    → authMiddleware
    → roleMiddleware('sales','founder')
    → utils/upload.js: uploadSpreadsheet (xlsx MIME allow-list, 15MB)
    → controllers/salesDeskController.js: importLeads(req,res)
        → ExcelJS.Workbook().xlsx.load(buffer)
        → isMarketingMasterSheet(workbook)  [detects sheet shape]
        → parseWorkbook(workbook)  OR  parseMarketingMasterWorkbook(workbook)
        → config/db.js: db.collection('sales_leads').limit(SALES_LEADS_READ_LIMIT).get()  [existing leads, for dedupe]
        → config/db.js: db.batch() → batch.set/update(...) → batch.commit()   [in chunks of 400]
        → utils/respond.js: created(res, {...})
```

## 8. POST /api/chat/:channelId/messages

```
routes/chatRoutes.js
  router.post('/:channelId/messages', auth, sendMessage)
    → authMiddleware
    → controllers/chatController.js: sendMessage(req,res)
        → canAccessChannel(channelId, req.user.id)   [DM participant check, no DB call]
        → config/db.js: db.collection('chat_messages').add({...})
        → utils/respond.js: created(res, {...})
```
No `roleMiddleware` — any authenticated user may post to a channel they can access.

## 9. GET /api/founder/dashboard-overview

```
routes/founderRoutes.js
  router.get('/dashboard-overview', auth, role('superadmin'), expensiveReadLimiter, getDashboardOverview)
    → authMiddleware
    → roleMiddleware('superadmin')
    → express-rate-limit (expensiveReadLimiter, 20/60s)
    → controllers/dashboardController.js: getDashboardOverview(req,res)
        → computeDashboardOverview()  [30s in-process cache]
            → Promise.all([
                db.collection('users').limit(DASHBOARD_SCAN_CAP).get(),
                db.collection('departments').count().get(),
                db.collection('it_complaints')/'hr_complaints'.limit(DASHBOARD_SCAN_CAP).get(),
                db.collection('approvals').where('status','==','pending_founder').count().get(),
                db.collection('leave_requests').where('status','==','Pending').count().get(),
                db.collection('assets').limit(DASHBOARD_SCAN_CAP).get(),
                slaController.SLA_POLICIES_DOC.get(),
                utils/sessions.js SESSIONS.where('revoked','==',false).count().get(),
                db.collection('failed_logins').where('at','>=',oneDayAgo).count().get(),
                db.collection('users').where('locked','==',true).count().get(),
              ])
        → utils/respond.js: ok(res, {...})
```

## 10. POST /api/auth/refresh

```
routes/authRoutes.js
  router.post('/refresh', authLimiter, refresh)   [no authMiddleware — self-authenticates via the refresh cookie]
    → controllers/authController.js: refresh(req,res)
        → utils/sessions.js: consumeRefreshToken(hash, {ip, userAgent})
            → db.runTransaction(async tx => {
                  tx.get(SESSIONS.where('refreshTokenHash','==',presentedHash).limit(1))
                  [rotation: tx.set(doc.ref, {new hash, previousRefreshTokenHash, ...})]
                  [reuse: tx.get(SESSIONS.where('previousRefreshTokenHash','==',presentedHash)) → tx.set({revoked:true})]
              })
        → config/db.js: db.collection('users').doc(result.uid).get()
        → authController.issueSessionCookies() → utils/jwt.js signAccessToken, utils/cookies.js setAuthCookie/setCsrfCookie
        → utils/cookies.js: setRefreshCookie()
        → utils/respond.js: ok(res, {refreshed:true, csrfToken})
```
`csrfMiddleware` also exempts this path (`EXEMPT_PATHS` in `middleware/csrfMiddleware.js`) since the refresh cookie itself is the unforgeable credential.

## Cross-reference

- Full prose + sequence diagrams for chains #1–#5 above: `05-request-response-flow.md`.
- Middleware behavior detail: `09-middleware.md`.
- Per-controller responsibility summary: `10-controllers.md`.
- Full endpoint inventory: `04-api-documentation.md`.
