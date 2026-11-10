Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node server.js", 0, False
WScript.Sleep 1000
WshShell.Run "http://localhost:3000", 1, False
