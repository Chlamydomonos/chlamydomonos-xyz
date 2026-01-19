Set-Location ./packages/common-lib
pnpm build
Set-Location ../codegen-tool
pnpm build
pnpm start
Set-Location ../frontend
pnpm build