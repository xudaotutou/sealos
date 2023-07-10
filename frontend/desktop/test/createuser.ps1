$url = "$env:baseurl/api/auth/password" # 目标 URL

$concurrentRequests =[int]$env:endnumber # 请求数
$start = [int]$env:startnumber # 起始用户编号
# $threads = @()
for ($i = $start; $i -le $concurrentRequests; $i++) {
	$data = @{
		"user"     = "test$($i % 100)user$i"
		"password" = "password$($i % 100)"
	}
	$start = Get-Date
	try {
		Write-Host "Sending POST request with data: $(ConvertTo-Json -Compress -InputObject $data)"
		Invoke-RestMethod -Uri $url -Body (ConvertTo-Json -Compress -InputObject $data) -SkipCertificateCheck -Method Post -ContentType "application/json"
		$end = Get-Date
		$executionTime = New-TimeSpan -Start $start -End $end
		Write-Output "Request duration: $($executionTime.TotalMilliseconds) ms"
		# Write-Output $output
	} catch {
		Write-Output $_.Exception.Message
	}
}