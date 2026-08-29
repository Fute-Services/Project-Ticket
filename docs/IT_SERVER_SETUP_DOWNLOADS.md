# Server Setup: What to Download and Install

**Target machine:** 192.168.1.121 (Web-Team server). **Purpose:** host the Fute Portal backend (the server-side code) and its database locally, on our own machine, with no cloud service subscription needed.

## 1. Download these (in order)

| # | Software | Download link | Notes |
|---|---|---|---|
| 1 | Node.js (LTS, meaning "Long Term Support", the stable recommended version) | https://nodejs.org/en/download | Pick the Windows Installer (.msi), LTS version. This also installs npm, a tool used to install other pieces of software the project needs. |
| 2 | MongoDB Community Server | https://www.mongodb.com/try/download/community | Choose "Windows x64", MSI package. This is the database (where all the app's data is stored). It's free and needs no account. |
| 3 | MongoDB Shell (mongosh, a command-line tool for talking directly to the database) | https://www.mongodb.com/try/download/shell | Usually included with the MongoDB installer. Only download it separately if it's missing after the main install. |
| 4 | Google Chrome (optional) | https://www.google.com/chrome/ | Only needed if it isn't already installed. Used for local testing and health checks. |

**Nothing else needs to be downloaded from the internet.** Two small tools, called PM2 and serve (covered in the install steps below), get installed automatically through npm once Node.js is in place. There's no separate installer needed for those.

## 2. Install steps

1. Run the Node.js `.msi` file, accept the default options, and finish.
2. Run the MongoDB `.msi` file, choose the "Complete" setup option, and keep "Install MongoDB as a Service" checked (this is the default). Finish the install.
3. Open PowerShell (a Windows command-line tool) as an Administrator, and verify both installed correctly by running:

```
node -v
mongosh --version
```

4. Enable MongoDB as a "replica set" (a database configuration required for the app's transactions, meaning grouped database changes that must all succeed or all fail together):
   - Open `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg` in Notepad, and add this at the bottom:

```
replication:
 replSetName: "rs0"
```

   - Restart the MongoDB service: open `services.msc`, find "MongoDB Server," and choose Restart.
   - Run this once: open `mongosh`, then type `rs.initiate()` and press Enter.

5. Install the two small tools mentioned earlier, using npm (no separate download needed):

```
npm install -g pm2 serve
```

## 3. Firewall

Allow these ports inbound (meaning incoming connections are allowed) only from the office local network (192.168.1.0/24), not from "Any" source:

- **5000**: the backend API (the server that handles requests from the website)
- **80**: the frontend (the website itself)

In Windows Firewall: go to Advanced Settings, then Inbound Rules, then New Rule, then Port, then TCP, then enter the specific local ports 80 and 5000. Choose "Allow the connection," and scope the rule so it only applies to the office's local network range.

## 4. After this is done

Hand the machine back to the development team. They'll copy the project's code onto it and get it running (this next step is covered in `SELF_HOSTED_LOCAL_MIGRATION.md`). IT's part of the work is just steps 1 through 3 above.
