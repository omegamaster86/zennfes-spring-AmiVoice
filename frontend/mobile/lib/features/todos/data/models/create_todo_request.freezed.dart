// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'create_todo_request.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

CreateTodoRequest _$CreateTodoRequestFromJson(Map<String, dynamic> json) {
  return _CreateTodoRequest.fromJson(json);
}

/// @nodoc
mixin _$CreateTodoRequest {
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  TodoPriority get priority => throw _privateConstructorUsedError;
  String? get dueDate => throw _privateConstructorUsedError;

  /// Serializes this CreateTodoRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CreateTodoRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CreateTodoRequestCopyWith<CreateTodoRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CreateTodoRequestCopyWith<$Res> {
  factory $CreateTodoRequestCopyWith(
    CreateTodoRequest value,
    $Res Function(CreateTodoRequest) then,
  ) = _$CreateTodoRequestCopyWithImpl<$Res, CreateTodoRequest>;
  @useResult
  $Res call({
    String title,
    String? description,
    TodoPriority priority,
    String? dueDate,
  });
}

/// @nodoc
class _$CreateTodoRequestCopyWithImpl<$Res, $Val extends CreateTodoRequest>
    implements $CreateTodoRequestCopyWith<$Res> {
  _$CreateTodoRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CreateTodoRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? priority = null,
    Object? dueDate = freezed,
  }) {
    return _then(
      _value.copyWith(
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            priority: null == priority
                ? _value.priority
                : priority // ignore: cast_nullable_to_non_nullable
                      as TodoPriority,
            dueDate: freezed == dueDate
                ? _value.dueDate
                : dueDate // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CreateTodoRequestImplCopyWith<$Res>
    implements $CreateTodoRequestCopyWith<$Res> {
  factory _$$CreateTodoRequestImplCopyWith(
    _$CreateTodoRequestImpl value,
    $Res Function(_$CreateTodoRequestImpl) then,
  ) = __$$CreateTodoRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String title,
    String? description,
    TodoPriority priority,
    String? dueDate,
  });
}

/// @nodoc
class __$$CreateTodoRequestImplCopyWithImpl<$Res>
    extends _$CreateTodoRequestCopyWithImpl<$Res, _$CreateTodoRequestImpl>
    implements _$$CreateTodoRequestImplCopyWith<$Res> {
  __$$CreateTodoRequestImplCopyWithImpl(
    _$CreateTodoRequestImpl _value,
    $Res Function(_$CreateTodoRequestImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CreateTodoRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? priority = null,
    Object? dueDate = freezed,
  }) {
    return _then(
      _$CreateTodoRequestImpl(
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        priority: null == priority
            ? _value.priority
            : priority // ignore: cast_nullable_to_non_nullable
                  as TodoPriority,
        dueDate: freezed == dueDate
            ? _value.dueDate
            : dueDate // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

@JsonSerializable(includeIfNull: false)
class _$CreateTodoRequestImpl implements _CreateTodoRequest {
  const _$CreateTodoRequestImpl({
    required this.title,
    this.description,
    this.priority = TodoPriority.medium,
    this.dueDate,
  });

  factory _$CreateTodoRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$CreateTodoRequestImplFromJson(json);

  @override
  final String title;
  @override
  final String? description;
  @override
  @JsonKey()
  final TodoPriority priority;
  @override
  final String? dueDate;

  @override
  String toString() {
    return 'CreateTodoRequest(title: $title, description: $description, priority: $priority, dueDate: $dueDate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CreateTodoRequestImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.dueDate, dueDate) || other.dueDate == dueDate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, title, description, priority, dueDate);

  /// Create a copy of CreateTodoRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CreateTodoRequestImplCopyWith<_$CreateTodoRequestImpl> get copyWith =>
      __$$CreateTodoRequestImplCopyWithImpl<_$CreateTodoRequestImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$CreateTodoRequestImplToJson(this);
  }
}

abstract class _CreateTodoRequest implements CreateTodoRequest {
  const factory _CreateTodoRequest({
    required final String title,
    final String? description,
    final TodoPriority priority,
    final String? dueDate,
  }) = _$CreateTodoRequestImpl;

  factory _CreateTodoRequest.fromJson(Map<String, dynamic> json) =
      _$CreateTodoRequestImpl.fromJson;

  @override
  String get title;
  @override
  String? get description;
  @override
  TodoPriority get priority;
  @override
  String? get dueDate;

  /// Create a copy of CreateTodoRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CreateTodoRequestImplCopyWith<_$CreateTodoRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
