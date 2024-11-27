Set objShell = CreateObject("WScript.Shell")
Set objMouse = CreateObject("WScript.Shell")

' Loop para mover o mouse
For i = 1 To 10 ' Número de movimentos
    x = 500 + (i * 10) ' Ajuste as coordenadas X e Y conforme necessário
    y = 500 + (i * 10)
    WScript.Sleep 100
    Call MoveMouse(x, y)
Next

Sub MoveMouse(x, y)
    Set objShell = CreateObject("WScript.Shell")
    objShell.SendKeys "{TAB}"
End Sub
