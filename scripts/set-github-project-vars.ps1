param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [Parameter(Mandatory = $true)]
    [string]$Repository
)

$ErrorActionPreference = "Stop"

$json = node scripts/print-project-field-ids.mjs --project-id $ProjectId --repo $Repository --json | ConvertFrom-Json

foreach ($property in $json.variables.PSObject.Properties) {
    $key = $property.Name
    $value = [string]$property.Value
    gh variable set $key --repo $Repository --body $value | Out-Null
    Write-Host "set $key"
}
