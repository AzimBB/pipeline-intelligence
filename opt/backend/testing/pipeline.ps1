$body = @{
    segment_id = "cacgp_line_a"
    start_time = "2026-05-05T00:00:00Z"
    end_time   = "2026-05-06T00:00:00Z"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/pipeline/simulate-segment" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body