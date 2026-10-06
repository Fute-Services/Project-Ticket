// One-off: loads the 2025-2026 project sheet. Skips if the collection already has rows.
const { db } = require('../config/db');
const sheet = db.collection('projectSheet');

// [projectCode, client, project, qty, scope, status] - links left blank (cut off in the source screenshot).
const ROWS = [
  ['FS3D 001-2025-26', 'Definer', 'Dolce Vita', 'Floor Plan', 4, 'Closed'],
  ['FS3D 002-2025-26', 'Sannidhi', 'Shantika', '3D walkthrough', 1, 'Active'],
  ['FS3D 009-2025-26', 'Keya Homes', 'Club House', '3D images', 9, 'Closed'],
  ['FS3D 010-2025-26', 'Keya Homes', 'Club House & 3 Unit Plan', 'scale model', 1, ''],
  ['FS3D 087-2024-25- Ver 1', 'Embassy', 'ETV Parcel 6', '3D walkthrough', 1, 'Closed'],
  ['FS3D 023-2025-26', 'Rustomjee', 'Bhagwan apartments', '3D Walkthrough Package', 4, 'Closed'],
  ['FS3D 025-2025-26', 'Hines', 'commercial', '3D images', 2, 'Closed'],
  ['FS3D 119-2024-25 - V 2', 'L&T', 'RTB - Modifications', 'Floor Plan', 14, 'Active'],
  ['FS3D 026-2025-26', 'Neelkant', 'Villa', '2D & 3D package', 11, 'Closed'],
  ['FS3D 131-2024-25 - V2', 'Amberstone', 'Ventarance Residence', '2D & 3D package', 1, 'Closed'],
  ['FS3D 028-2025-26', 'Shriram Properties', '122 West', 'Master plan', 1, 'Closed'],
  ['FS3D 030-2025-26', 'L&T', 'RTB - Bangalore', '360 virtual tour', 25, 'Active'],
  ['FS3D 033-2025-26', 'L&T', 'Rework - Chennai', '3D walkthrough', 1, 'Closed'],
  ['FS3D 036-2025-26', 'Nahar Builders', 'YUU - Chandivali Powai', '3D Walkthrough Package', 2, 'Closed'],
  ['FS3D 037-2025-26', 'Soven Build tech', 'Soven Sachi', '3D walkthrough', 1, 'Closed'],
  ['FS3D 001-2025-26 V1', 'Definer', 'Dolce Vita', 'Master plan', 1, 'Closed'],
  ['FS3D 057- 2024-25 V1', 'Purvankara Ltd', 'Mallasandra', 'Floor Plan', 15, 'Active'],
  ['FS3D 030-2025-26', 'L&T', 'RTB - Bangalore', '360 virtual tour', 25, ''],
  ['FS3D 033-2025-26', 'L&T', 'Rework - Chennai', '3D walkthrough', 1, 'Closed'],
  ['FS3D 036-2025-26', 'Nahar Builders', 'YUU - Chandivali Powai', '3D Walkthrough Package', 2, 'Closed'],
  ['FS3D 037-2025-26', 'Soven Build tech', 'Soven Sachi', '3D walkthrough', 1, 'Closed'],
  ['FS3D 038-2025-26', 'Kraheja', 'Commercial', 'Interactive website', 2, 'Active'],
];
// Remarks visible in the sheet, keyed by Sl no.
const REMARKS = {
  3: 'Video quality is poor / Current project',
  4: 'External folder found; Final Images / TIFF has 9 files. Verify versions, watermark-free files, client dispatch/acceptance',
  5: 'Closed / its hardcopy only',
};

(async () => {
  const existing = await sheet.limit(1).get();
  if (!existing.empty) {
    console.log('projectSheet already has rows - skipping seed');
    process.exit(0);
  }
  const now = new Date().toISOString();
  for (const [i, [projectCode, clientName, projectName, qty, scope, status]] of ROWS.entries()) {
    await sheet.add({
      slNo: i + 1, projectCode, clientName, projectName, qty, scope, status,
      outputDriveLink: '', asanaLink: '', remarks: REMARKS[i + 1] || '', created_at: now,
    });
  }
  console.log(`Seeded ${ROWS.length} rows`);
  process.exit(0);
})();
