import UIKit
import WebKit
import AVFoundation

class ViewController: UIViewController {
    
    // MARK: - Properties
    private var webView: WKWebView!
    private var progressView: UIProgressView!
    private var refreshControl: UIRefreshControl!
    private var loadingView: UIView!
    private var activityIndicator: UIActivityIndicatorView!
    
    // TTS Properties
    private var speechSynthesizer: AVSpeechSynthesizer!
    private var isTTSEnabled = true
    private var currentUtterance: AVSpeechUtterance?
    
    // Navigation items
    private var refreshButton: UIBarButtonItem!
    private var shareButton: UIBarButtonItem!
    private var ttsToggleButton: UIBarButtonItem!
    
    // Constants
    private let chatbotURL = "https://ai-chatbot-1-a596.onrender.com/"
    private let primaryColor = UIColor(red: 0.117, green: 0.251, blue: 0.686, alpha: 1.0) // #1e40af
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupWebView()
        setupTTS()
        setupConstraints()
        setupNavigationBar()
        loadChatbot()
        
        // Request microphone permission for TTS
        requestMicrophonePermission()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Inject TTS JavaScript when view appears
        injectTTSJavaScript()
    }
    
    // MARK: - Setup Methods
    private func setupUI() {
        view.backgroundColor = UIColor.systemBackground
        title = "AKCB CHATBOT"
        
        // Create loading view
        loadingView = UIView()
        loadingView.backgroundColor = UIColor.systemBackground
        loadingView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loadingView)
        
        // Create activity indicator
        activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.color = primaryColor
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingView.addSubview(activityIndicator)
        
        // Create progress view
        progressView = UIProgressView(progressViewStyle: .default)
        progressView.progressTintColor = primaryColor
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.isHidden = true
        view.addSubview(progressView)
        
        // Create refresh control
        refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(refreshWebView), for: .valueChanged)
    }
    
    private func setupWebView() {
        // Configure WebView
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Allow arbitrary loads for development
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        configuration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // Create WebView
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.refreshControl = refreshControl
        
        // Add observer for progress
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        
        view.addSubview(webView)
    }
    
    private func setupTTS() {
        speechSynthesizer = AVSpeechSynthesizer()
        speechSynthesizer.delegate = self
        
        // Configure audio session
        configureAudioSession()
    }
    
    private func setupNavigationBar() {
        // Refresh button
        refreshButton = UIBarButtonItem(
            barButtonSystemItem: .refresh,
            target: self,
            action: #selector(refreshWebView)
        )
        
        // Share button
        shareButton = UIBarButtonItem(
            barButtonSystemItem: .action,
            target: self,
            action: #selector(shareApp)
        )
        
        // TTS toggle button
        let ttsImage = UIImage(systemName: isTTSEnabled ? "speaker.2.fill" : "speaker.slash.fill")
        ttsToggleButton = UIBarButtonItem(
            image: ttsImage,
            style: .plain,
            target: self,
            action: #selector(toggleTTS)
        )
        
        navigationItem.rightBarButtonItems = [shareButton, ttsToggleButton, refreshButton]
        
        // Add custom title with AKCB branding
        let titleLabel = UILabel()
        titleLabel.text = "AKCB CHATBOT"
        titleLabel.textColor = UIColor.white
        titleLabel.font = UIFont.boldSystemFont(ofSize: 18)
        navigationItem.titleView = titleLabel
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Progress view
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2),
            
            // WebView
            webView.topAnchor.constraint(equalTo: progressView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Loading view
            loadingView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            loadingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            loadingView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            loadingView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Activity indicator
            activityIndicator.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor)
        ])
    }
    
    // MARK: - WebView Methods
    private func loadChatbot() {
        guard let url = URL(string: chatbotURL) else {
            showError("Invalid URL")
            return
        }
        
        let request = URLRequest(url: url)
        activityIndicator.startAnimating()
        webView.load(request)
    }
    
    @objc private func refreshWebView() {
        webView.reload()
        refreshControl.endRefreshing()
    }
    
    // MARK: - TTS Methods
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }
    
    private func requestMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                if granted {
                    print("Microphone permission granted")
                } else {
                    print("Microphone permission denied")
                }
            }
        }
    }
    
    @objc private func toggleTTS() {
        isTTSEnabled.toggle()
        
        if !isTTSEnabled {
            speechSynthesizer.stopSpeaking(at: .immediate)
        }
        
        updateTTSButton()
        
        // Send TTS state to WebView
        let jsCode = "if (window.iOSTTS) { window.iOSTTS.setEnabled(\(isTTSEnabled)); }"
        webView.evaluateJavaScript(jsCode, completionHandler: nil)
    }
    
    private func updateTTSButton() {
        let imageName = isTTSEnabled ? "speaker.2.fill" : "speaker.slash.fill"
        ttsToggleButton.image = UIImage(systemName: imageName)
        ttsToggleButton.tintColor = isTTSEnabled ? .systemBlue : .systemRed
    }
    
    private func speak(text: String) {
        guard isTTSEnabled, !text.isEmpty else { return }
        
        // Stop current speech
        speechSynthesizer.stopSpeaking(at: .immediate)
        
        // Create utterance
        let utterance = AVSpeechUtterance(string: text)
        
        // Configure for Female UK voice (default preference)
        if let voice = AVSpeechSynthesisVoice(language: "en-GB") {
            utterance.voice = voice
        } else if let voice = AVSpeechSynthesisVoice(language: "en-US") {
            utterance.voice = voice
        }
        
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.1
        utterance.volume = 0.8
        
        currentUtterance = utterance
        speechSynthesizer.speak(utterance)
    }
    
    private func injectTTSJavaScript() {
        let jsCode = """
        // iOS TTS Integration
        window.iOSTTS = {
            speak: function(text) {
                window.webkit.messageHandlers.ttsHandler.postMessage({
                    action: 'speak',
                    text: text
                });
            },
            stop: function() {
                window.webkit.messageHandlers.ttsHandler.postMessage({
                    action: 'stop'
                });
            },
            setEnabled: function(enabled) {
                window.webkit.messageHandlers.ttsHandler.postMessage({
                    action: 'setEnabled',
                    enabled: enabled
                });
                // Update global TTS state
                if (typeof ttsEnabled !== 'undefined') {
                    ttsEnabled = enabled;
                }
            },
            isSpeaking: function() {
                return window.iOSSpeaking || false;
            }
        };
        
        // Override existing TTS functions to use iOS TTS
        if (typeof speak === 'function') {
            const originalSpeak = speak;
            speak = function(text) {
                if (window.iOSTTS && ttsEnabled) {
                    window.iOSTTS.speak(text);
                } else {
                    originalSpeak(text);
                }
            };
        }
        
        if (typeof stopSpeaking === 'function') {
            const originalStopSpeaking = stopSpeaking;
            stopSpeaking = function() {
                if (window.iOSTTS) {
                    window.iOSTTS.stop();
                } else {
                    originalStopSpeaking();
                }
            };
        }
        
        // Enhanced Web Speech API fallback
        if (!window.speechSynthesis) {
            window.speechSynthesis = {
                speak: function(utterance) {
                    if (utterance && utterance.text) {
                        window.iOSTTS.speak(utterance.text);
                    }
                },
                cancel: function() {
                    window.iOSTTS.stop();
                },
                getVoices: function() {
                    return [{
                        name: 'iOS Female UK',
                        lang: 'en-GB',
                        gender: 'female',
                        default: true
                    }];
                }
            };
            
            window.SpeechSynthesisUtterance = function(text) {
                this.text = text;
                this.lang = 'en-GB';
                this.rate = 0.9;
                this.pitch = 1.1;
            };
        }
        
        // Test function
        window.testIOSTTS = function(text) {
            window.iOSTTS.speak(text || 'Hello! This is a test of iOS text-to-speech functionality.');
        };
        
        console.log('iOS TTS integration loaded successfully');
        """
        
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "ttsHandler")
        webView.configuration.userContentController.add(self, name: "ttsHandler")
        
        let userScript = WKUserScript(source: jsCode, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        webView.configuration.userContentController.addUserScript(userScript)
        
        webView.evaluateJavaScript(jsCode, completionHandler: nil)
    }
    
    // MARK: - Helper Methods
    @objc private func shareApp() {
        let items = [
            "Check out the AKCB Chatbot app!",
            URL(string: chatbotURL)!
        ]
        
        let activityViewController = UIActivityViewController(activityItems: items, applicationActivities: nil)
        
        // For iPad
        if let popover = activityViewController.popoverPresentationController {
            popover.barButtonItem = shareButton
        }
        
        present(activityViewController, animated: true)
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Observer
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressView.progress = Float(webView.estimatedProgress)
            progressView.isHidden = webView.estimatedProgress >= 1.0
        }
    }
    
    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "ttsHandler")
    }
}

// MARK: - WKNavigationDelegate
extension ViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        activityIndicator.startAnimating()
        progressView.isHidden = false
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        activityIndicator.stopAnimating()
        loadingView.isHidden = true
        progressView.isHidden = true
        
        // Inject TTS JavaScript after page loads
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.injectTTSJavaScript()
        }
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        activityIndicator.stopAnimating()
        loadingView.isHidden = true
        progressView.isHidden = true
        showError("Failed to load chatbot: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        
        let urlString = url.absoluteString
        
        // Handle special URLs
        if urlString.hasPrefix("tel:") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else if urlString.hasPrefix("sms:") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else if urlString.hasPrefix("mailto:") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else if urlString.contains("whatsapp") || urlString.contains("wa.me") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else if url.host != URL(string: chatbotURL)?.host && navigationAction.navigationType == .linkActivated {
            // External links open in Safari
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }
}

// MARK: - WKUIDelegate
extension ViewController: WKUIDelegate {
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Alert", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler()
        })
        present(alert, animated: true)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "Confirm", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler(true)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
            completionHandler(false)
        })
        present(alert, animated: true)
    }
}

// MARK: - WKScriptMessageHandler
extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "ttsHandler",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }
        
        switch action {
        case "speak":
            if let text = body["text"] as? String {
                speak(text: text)
            }
        case "stop":
            speechSynthesizer.stopSpeaking(at: .immediate)
        case "setEnabled":
            if let enabled = body["enabled"] as? Bool {
                isTTSEnabled = enabled
                updateTTSButton()
            }
        default:
            break
        }
    }
}

// MARK: - AVSpeechSynthesizerDelegate
extension ViewController: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            let jsCode = "window.iOSSpeaking = true;"
            self.webView.evaluateJavaScript(jsCode, completionHandler: nil)
        }
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            let jsCode = "window.iOSSpeaking = false;"
            self.webView.evaluateJavaScript(jsCode, completionHandler: nil)
        }
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            let jsCode = "window.iOSSpeaking = false;"
            self.webView.evaluateJavaScript(jsCode, completionHandler: nil)
        }
    }
}
