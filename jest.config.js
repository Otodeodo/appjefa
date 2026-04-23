module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo/src/winter/ImportMetaRegistry$': '<rootDir>/__mocks__/ImportMetaRegistry.js',
    '^expo/src/winter/runtime\\.native$': '<rootDir>/__mocks__/expoWinterRuntime.js',
    '^expo/src/winter$': '<rootDir>/__mocks__/expoWinter.js',
  },
}
