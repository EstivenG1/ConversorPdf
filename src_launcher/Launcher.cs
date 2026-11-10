using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace ConversorG
{
    static class Program
    {
        private static Process serverProcess = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(baseDir, "server.js");

            if (!File.Exists(serverScript))
            {
                MessageBox.Show("No se encontró el archivo server.js en: " + baseDir,
                    "ConversorG - Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            int port = 3000;
            bool isServerRunning = IsPortInUse(port);

            if (!isServerRunning)
            {
                // Iniciar proceso Node.js en segundo plano sin ventana de consola
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "node";
                    psi.Arguments = "\"" + serverScript + "\"";
                    psi.WorkingDirectory = baseDir;
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;

                    serverProcess = Process.Start(psi);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("No se pudo iniciar Node.js automáticamente.\nDetalle: " + ex.Message +
                        "\n\nPuedes ejecutar también 'ConversorG.bat'.",
                        "ConversorG", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }

                // Esperar a que el servidor responda (máximo 5 segundos)
                for (int i = 0; i < 25; i++)
                {
                    Thread.Sleep(200);
                    if (IsPortInUse(port))
                    {
                        isServerRunning = true;
                        break;
                    }
                }
            }

            // Abrir navegador web predeterminado en localhost:3000
            try
            {
                Process.Start(new ProcessStartInfo("http://localhost:" + port) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Servidor iniciado en http://localhost:" + port + "\n\nError al abrir el navegador: " + ex.Message,
                    "ConversorG", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (success && client.Connected)
                    {
                        client.EndConnect(result);
                        return true;
                    }
                }
            }
            catch { }
            return false;
        }
    }
}
