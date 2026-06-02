plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.compose.compiler)
  alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.example.numera"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.example.numera"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        // Java 17 is the app's TARGET bytecode level — do not bump to a newer JDK here.
        // Android (D8/R8 + ART) caps the shippable target at 17 (21 is only partially
        // desugared); there is no Java 21/26 language feature that can reach a packaged
        // Android app, so a higher target buys nothing and is unsupported by the toolchain.
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
      compose = true
      aidl = false
      buildConfig = false
      shaders = false
    }

    packaging {
      resources {
        excludes += "/META-INF/{AL2.0,LGPL2.1}"
      }
    }

    testOptions {
      unitTests {
        // Robolectric needs the merged Android resources/manifest on the unit-test classpath
        // so Compose UI tests can run on the JVM (no device/emulator).
        isIncludeAndroidResources = true
      }
    }
}

kotlin {
    // Pin the compile + unit-test toolchain to JDK 17 (an LTS Android aligns with). This is the
    // JDK that compiles the code AND runs `testDebugUnitTest` — keep it at 17 (or a future
    // Android-supported LTS like 21), NOT 26:
    //   • Robolectric (the JVM Compose UI test net) supports ~17–21, not 26 — bumping this
    //     would break `testDebugUnitTest`.
    //   • It's independent of the Gradle daemon JDK (that can be 26); Gradle provisions a
    //     JDK 17 for the toolchain regardless of the dev's installed JDK.
    jvmToolchain(17)
}

dependencies {
  val composeBom = platform(libs.androidx.compose.bom)
  implementation(composeBom)
  androidTestImplementation(composeBom)

  // Core Android dependencies
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.activity.compose)

  // Arch Components
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.viewmodel.compose)

  // Compose
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.compose.material3)
  implementation("androidx.compose.material:material-icons-core")
  implementation("androidx.compose.material:material-icons-extended")
  // Tooling
  debugImplementation(libs.androidx.compose.ui.tooling)
  // Instrumented tests
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  debugImplementation(libs.androidx.compose.ui.test.manifest)

  // Local tests: jUnit, coroutines, Android runner
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)

  // JVM Compose UI test net (Robolectric — runs on the JVM, no device/emulator):
  testImplementation(composeBom)
  testImplementation(libs.androidx.compose.ui.test.junit4)
  testImplementation(libs.robolectric)
  testImplementation(libs.androidx.test.ext.junit)
  testImplementation(libs.androidx.test.core)
  testImplementation(libs.mockk)
  // createComposeRule() needs the test ComponentActivity; ui-test-manifest is already a
  // debugImplementation below, which is on the unit-test classpath for the debug variant.

  // Instrumented tests: jUnit rules and runners
  androidTestImplementation(libs.androidx.test.core)
  androidTestImplementation(libs.androidx.test.ext.junit)
  androidTestImplementation(libs.androidx.test.runner)
  androidTestImplementation(libs.androidx.test.espresso.core)

  // Navigation
  implementation(libs.androidx.navigation3.ui)
  implementation(libs.androidx.navigation3.runtime)
  implementation(libs.androidx.lifecycle.viewmodel.navigation3)

  // Retrofit & Networking
  implementation("com.squareup.retrofit2:retrofit:2.11.0")
  implementation("com.squareup.retrofit2:converter-gson:2.11.0")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

  // Real-time WebSockets
  implementation("io.socket:socket.io-client:2.1.1") {
    exclude(group = "org.json", module = "json")
  }

  // Kotlinx Serialization
  implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
