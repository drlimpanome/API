@echo off
set xPos=500
set yPos=300

powershell -command "Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class MouseMover {
    [DllImport(\"user32.dll\", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void SetCursorPos(int X, int Y);
}
'@ -Name MouseMover -Namespace WinAPI -PassThru | Out-Null; [WinAPI.MouseMover]::SetCursorPos(%xPos%, %yPos%)"
pause