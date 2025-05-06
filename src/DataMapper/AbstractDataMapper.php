<?php

namespace App\DataMapper;

abstract class AbstractDataMapper
{
    protected $resource;

    public function __construct($resource)
    {
        $this->resource = $resource;
    }

    abstract public function toArray($request): array;

    public function all($request)
    {
        if (empty($this->resource)) {
            return $this->resource;
        }

        $result = [];
        $data = $this->toArray($request);

        if (empty($data)) {
            return $data;
        }

        foreach ($data as $fieldName => $value) {
            if ($value instanceof self) {
                $result[$fieldName] = $value->all($request);
                continue;
            }

            $result[$fieldName] = $value;
        }

        return $result;
    }

    public static function list(array $list): ListDataMapper
    {
        $arguments = func_get_args();

        array_shift( $arguments );

        return new ListDataMapper($list, static::class, $arguments);
    }


    public function __call($name, $arguments)
    {
        return call_user_func_array([$this->resource, $name], $arguments);
    }

    public function __get($name)
    {
        return $this->resouce->{$name};
    }

}
